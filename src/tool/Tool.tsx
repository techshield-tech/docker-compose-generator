import { useCallback, useMemo, useState } from 'react';
import { Button, CopyButton, ErrorBox, Panel, Select, TextArea, Toolbar, type SelectOption } from '../shell/ui';
import { genId } from './id';
import { PRESET_KINDS, PRESET_LABELS, createPresetService, uniqueServiceName, type PresetKind } from './presets';
import { parseComposeYaml } from './fromYaml';
import { ServiceEditor } from './ServiceEditor';
import { toComposeYaml } from './toYaml';
import { emptyService, type ServiceForm } from './types';
import { validateForm } from './validation';

const PRESET_OPTIONS: SelectOption[] = PRESET_KINDS.map((kind) => ({ value: kind, label: PRESET_LABELS[kind] }));

function cloneServiceForDuplicate(source: ServiceForm, existingNames: string[]): ServiceForm {
  return {
    ...source,
    id: genId(),
    name: uniqueServiceName(`${source.name || 'service'}-copy`, existingNames),
    ports: source.ports.map((p) => ({ ...p, id: genId() })),
    environment: source.environment.map((e) => ({ ...e, id: genId() })),
    envFiles: source.envFiles.map((f) => ({ ...f, id: genId() })),
    volumes: source.volumes.map((v) => ({ ...v, id: genId() })),
    dependsOn: source.dependsOn.map((d) => ({ ...d, id: genId() })),
    networks: source.networks.map((n) => ({ ...n, id: genId() })),
    healthcheck: { ...source.healthcheck },
  };
}

export function Tool() {
  const [services, setServices] = useState<ServiceForm[]>([]);
  const [presetKind, setPresetKind] = useState<PresetKind>(PRESET_KINDS[0]);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const updateService = useCallback((id: string, patch: Partial<ServiceForm>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const duplicateService = useCallback((id: string) => {
    setServices((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      if (index === -1) return prev;
      const clone = cloneServiceForDuplicate(prev[index], prev.map((s) => s.name));
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  }, []);

  const addBlankService = useCallback(() => {
    setServices((prev) => [...prev, emptyService(uniqueServiceName('service', prev.map((s) => s.name)))]);
  }, []);

  const addPresetService = useCallback(() => {
    setServices((prev) => [...prev, createPresetService(presetKind, prev.map((s) => s.name))]);
  }, [presetKind]);

  const handleImport = useCallback(() => {
    try {
      const parsed = parseComposeYaml(importText);
      setServices(parsed);
      setImportError(null);
      setShowImport(false);
      setImportText('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }, [importText]);

  const hasNamedService = services.some((s) => s.name.trim() !== '');
  const yamlOutput = useMemo(
    () => (hasNamedService ? toComposeYaml(services) : ''),
    [services, hasNamedService],
  );
  const issues = useMemo(() => validateForm(services), [services]);

  const handleDownload = useCallback(() => {
    if (yamlOutput === '') return;
    const blob = new Blob([yamlOutput], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'compose.yaml';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [yamlOutput]);

  return (
    <div className="flex flex-col gap-4">
      <Toolbar>
        <Button variant="primary" onClick={addBlankService}>
          + Add service
        </Button>
        <Select
          aria-label="Preset service"
          value={presetKind}
          onChange={(event) => setPresetKind(event.target.value as PresetKind)}
          options={PRESET_OPTIONS}
        />
        <Button variant="secondary" onClick={addPresetService}>
          + Add preset
        </Button>
        <Button variant="ghost" onClick={() => setShowImport((v) => !v)}>
          {showImport ? 'Hide import' : 'Import from YAML'}
        </Button>
      </Toolbar>

      {showImport && (
        <Panel title="Import compose.yaml">
          <div className="flex flex-col gap-2">
            <TextArea
              aria-label="Compose YAML to import"
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste an existing compose.yaml here…"
              className="min-h-[160px]"
            />
            {importError && <ErrorBox>Could not parse YAML: {importError}</ErrorBox>}
            <Toolbar>
              <Button variant="primary" onClick={handleImport} disabled={importText.trim() === ''}>
                Parse and load
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowImport(false);
                  setImportError(null);
                }}
              >
                Cancel
              </Button>
            </Toolbar>
            <p className="text-xs text-[var(--color-muted)]">
              This replaces all services currently in the form below. Unsupported or unusual fields are skipped
              rather than causing an error.
            </p>
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-4">
          {services.length === 0 && (
            <Panel>
              <p className="text-sm text-[var(--color-muted)]">
                No services yet. Add a blank service or pick a preset above to get started.
              </p>
            </Panel>
          )}
          {services.map((service) => (
            <ServiceEditor
              key={service.id}
              service={service}
              otherServiceNames={services
                .filter((s) => s.id !== service.id)
                .map((s) => s.name)
                .filter(Boolean)}
              onChange={(patch) => updateService(service.id, patch)}
              onRemove={() => removeService(service.id)}
              onDuplicate={() => duplicateService(service.id)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4">
          {issues.length > 0 && (
            <ErrorBox>
              <ul className="list-disc space-y-1 pl-4">
                {issues.map((issue) => (
                  <li key={issue.id}>
                    {issue.level === 'warning' ? 'Warning: ' : ''}
                    {issue.message}
                  </li>
                ))}
              </ul>
            </ErrorBox>
          )}

          <Panel
            title="compose.yaml"
            actions={
              <>
                <CopyButton getText={() => yamlOutput} />
                <Button variant="secondary" onClick={handleDownload} disabled={yamlOutput === ''}>
                  Download
                </Button>
              </>
            }
          >
            <TextArea
              aria-label="Generated compose.yaml"
              value={yamlOutput}
              readOnly
              placeholder="Add at least one named service to generate compose.yaml…"
              className="min-h-[400px]"
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
