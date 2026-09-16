import { Button, Panel, Select, Toolbar, type SelectOption } from '../shell/ui';
import { CheckboxField, Field, Input, ROW_CLASS, SectionLabel } from './fields';
import { genId } from './id';
import { listOps } from './listOps';
import type { DependsOnEntry, ServiceForm } from './types';

const RESTART_OPTIONS: SelectOption[] = [
  { value: 'no', label: 'no' },
  { value: 'always', label: 'always' },
  { value: 'on-failure', label: 'on-failure' },
  { value: 'unless-stopped', label: 'unless-stopped' },
];

const PROTOCOL_OPTIONS: SelectOption[] = [
  { value: 'tcp', label: 'tcp' },
  { value: 'udp', label: 'udp' },
];

const VOLUME_KIND_OPTIONS: SelectOption[] = [
  { value: 'named', label: 'Named volume' },
  { value: 'bind', label: 'Bind mount' },
];

export interface ServiceEditorProps {
  service: ServiceForm;
  otherServiceNames: string[];
  onChange: (patch: Partial<ServiceForm>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

export function ServiceEditor({ service, otherServiceNames, onChange, onRemove, onDuplicate }: ServiceEditorProps) {
  const ports = listOps(service.ports, (next) => onChange({ ports: next }));
  const environment = listOps(service.environment, (next) => onChange({ environment: next }));
  const envFiles = listOps(service.envFiles, (next) => onChange({ envFiles: next }));
  const volumes = listOps(service.volumes, (next) => onChange({ volumes: next }));
  const dependsOn = listOps(service.dependsOn, (next) => onChange({ dependsOn: next }));
  const networks = listOps(service.networks, (next) => onChange({ networks: next }));

  function dependencyOptions(dep: DependsOnEntry): SelectOption[] {
    const names = new Set(otherServiceNames.filter(Boolean));
    if (dep.service) names.add(dep.service);
    return Array.from(names).map((name) => ({ value: name, label: name }));
  }

  return (
    <Panel
      title={service.name.trim() || 'Unnamed service'}
      actions={
        <>
          <Button variant="ghost" onClick={onDuplicate}>
            Duplicate
          </Button>
          <Button variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Field label="Service name" className="min-w-[140px] flex-1">
            <Input
              value={service.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="e.g. api"
            />
          </Field>
          <Field label="Container name (optional)" className="min-w-[140px] flex-1">
            <Input
              value={service.containerName}
              onChange={(event) => onChange({ containerName: event.target.value })}
              placeholder="e.g. api-1"
            />
          </Field>
          <Field label="Restart policy" className="min-w-[140px]">
            <Select
              value={service.restart}
              onChange={(event) => onChange({ restart: event.target.value as ServiceForm['restart'] })}
              options={RESTART_OPTIONS}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <Toolbar>
            <Button
              variant={service.sourceMode === 'image' ? 'primary' : 'secondary'}
              onClick={() => onChange({ sourceMode: 'image' })}
            >
              Image
            </Button>
            <Button
              variant={service.sourceMode === 'build' ? 'primary' : 'secondary'}
              onClick={() => onChange({ sourceMode: 'build' })}
            >
              Build
            </Button>
          </Toolbar>
          {service.sourceMode === 'image' ? (
            <Field label="Image">
              <Input
                value={service.image}
                onChange={(event) => onChange({ image: event.target.value })}
                placeholder="e.g. nginx:1.27-alpine"
              />
            </Field>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Field label="Build context" className="min-w-[140px] flex-1">
                <Input
                  value={service.buildContext}
                  onChange={(event) => onChange({ buildContext: event.target.value })}
                  placeholder="./app"
                />
              </Field>
              <Field label="Dockerfile" className="min-w-[140px] flex-1">
                <Input
                  value={service.buildDockerfile}
                  onChange={(event) => onChange({ buildDockerfile: event.target.value })}
                  placeholder="Dockerfile"
                />
              </Field>
            </div>
          )}
        </div>

        <Field label="Command (optional)">
          <Input
            value={service.command}
            onChange={(event) => onChange({ command: event.target.value })}
            placeholder="e.g. npm start"
          />
        </Field>

        <SectionLabel>Ports</SectionLabel>
        <div className="flex flex-col gap-2">
          {service.ports.map((port) => (
            <div key={port.id} className={ROW_CLASS}>
              <Field label="Host port">
                <Input
                  value={port.host}
                  onChange={(event) => ports.patch(port.id, { host: event.target.value })}
                  placeholder="8080 (blank = random)"
                  className="w-40"
                />
              </Field>
              <Field label="Container port">
                <Input
                  value={port.container}
                  onChange={(event) => ports.patch(port.id, { container: event.target.value })}
                  placeholder="80"
                  className="w-24"
                />
              </Field>
              <Field label="Protocol">
                <Select
                  value={port.protocol}
                  onChange={(event) =>
                    ports.patch(port.id, { protocol: event.target.value as 'tcp' | 'udp' })
                  }
                  options={PROTOCOL_OPTIONS}
                  className="w-20"
                />
              </Field>
              <Button variant="ghost" onClick={() => ports.remove(port.id)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() => ports.add({ id: genId(), host: '', container: '', protocol: 'tcp' })}
          >
            + Add port
          </Button>
        </div>

        <SectionLabel>Environment</SectionLabel>
        <div className="flex flex-col gap-2">
          {service.environment.map((entry) => (
            <div key={entry.id} className={ROW_CLASS}>
              <Field label="Key" className="min-w-[120px] flex-1">
                <Input
                  value={entry.key}
                  onChange={(event) => environment.patch(entry.id, { key: event.target.value })}
                  placeholder="KEY"
                />
              </Field>
              <Field label="Value" className="min-w-[120px] flex-1">
                <Input
                  value={entry.value}
                  onChange={(event) => environment.patch(entry.id, { value: event.target.value })}
                  placeholder="value"
                />
              </Field>
              <Button variant="ghost" onClick={() => environment.remove(entry.id)}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => environment.add({ id: genId(), key: '', value: '' })}>
            + Add variable
          </Button>
        </div>

        <SectionLabel>Env files</SectionLabel>
        <div className="flex flex-col gap-2">
          {service.envFiles.map((file) => (
            <div key={file.id} className={ROW_CLASS}>
              <Field label="Path" className="min-w-[160px] flex-1">
                <Input
                  value={file.path}
                  onChange={(event) => envFiles.patch(file.id, { path: event.target.value })}
                  placeholder=".env"
                />
              </Field>
              <Button variant="ghost" onClick={() => envFiles.remove(file.id)}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => envFiles.add({ id: genId(), path: '' })}>
            + Add env_file
          </Button>
        </div>

        <SectionLabel>Volumes</SectionLabel>
        <div className="flex flex-col gap-2">
          {service.volumes.map((volume) => (
            <div key={volume.id} className={ROW_CLASS}>
              <Field label="Type">
                <Select
                  value={volume.kind}
                  onChange={(event) =>
                    volumes.patch(volume.id, { kind: event.target.value as 'named' | 'bind' })
                  }
                  options={VOLUME_KIND_OPTIONS}
                  className="w-36"
                />
              </Field>
              <Field label={volume.kind === 'named' ? 'Volume name' : 'Host path'} className="min-w-[140px] flex-1">
                <Input
                  value={volume.source}
                  onChange={(event) => volumes.patch(volume.id, { source: event.target.value })}
                  placeholder={volume.kind === 'named' ? 'data' : './data'}
                />
              </Field>
              <Field label="Container path" className="min-w-[140px] flex-1">
                <Input
                  value={volume.target}
                  onChange={(event) => volumes.patch(volume.id, { target: event.target.value })}
                  placeholder="/data"
                />
              </Field>
              <CheckboxField
                checked={volume.readOnly}
                onChange={(checked) => volumes.patch(volume.id, { readOnly: checked })}
                label="Read-only"
              />
              <Button variant="ghost" onClick={() => volumes.remove(volume.id)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              volumes.add({ id: genId(), kind: 'named', source: '', target: '', readOnly: false })
            }
          >
            + Add volume
          </Button>
        </div>

        <SectionLabel>Depends on</SectionLabel>
        <div className="flex flex-col gap-2">
          {service.dependsOn.map((dep) => (
            <div key={dep.id} className={ROW_CLASS}>
              <Field label="Service" className="min-w-[160px] flex-1">
                <Select
                  value={dep.service}
                  onChange={(event) => dependsOn.patch(dep.id, { service: event.target.value })}
                  options={dependencyOptions(dep)}
                />
              </Field>
              <CheckboxField
                checked={dep.waitForHealthy}
                onChange={(checked) => dependsOn.patch(dep.id, { waitForHealthy: checked })}
                label="Wait for healthy"
              />
              <Button variant="ghost" onClick={() => dependsOn.remove(dep.id)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="secondary"
            disabled={otherServiceNames.length === 0}
            onClick={() =>
              dependsOn.add({ id: genId(), service: otherServiceNames[0] ?? '', waitForHealthy: false })
            }
          >
            + Add dependency
          </Button>
          {otherServiceNames.length === 0 && (
            <p className="text-xs text-[var(--color-muted)]">Add another named service first.</p>
          )}
        </div>

        <SectionLabel>Networks</SectionLabel>
        <div className="flex flex-col gap-2">
          {service.networks.map((network) => (
            <div key={network.id} className={ROW_CLASS}>
              <Field label="Network name" className="min-w-[160px] flex-1">
                <Input
                  value={network.name}
                  onChange={(event) => networks.patch(network.id, { name: event.target.value })}
                  placeholder="e.g. backend"
                />
              </Field>
              <Button variant="ghost" onClick={() => networks.remove(network.id)}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => networks.add({ id: genId(), name: '' })}>
            + Add network
          </Button>
        </div>

        <SectionLabel>Healthcheck</SectionLabel>
        <div className="flex flex-col gap-2">
          <CheckboxField
            checked={service.healthcheck.enabled}
            onChange={(checked) => onChange({ healthcheck: { ...service.healthcheck, enabled: checked } })}
            label="Enable healthcheck"
          />
          {service.healthcheck.enabled && (
            <div className="flex flex-wrap gap-2">
              <Field label="Test command (shell)" className="min-w-[200px] flex-1">
                <Input
                  value={service.healthcheck.test}
                  onChange={(event) =>
                    onChange({ healthcheck: { ...service.healthcheck, test: event.target.value } })
                  }
                  placeholder="e.g. redis-cli ping"
                />
              </Field>
              <Field label="Interval" className="w-24">
                <Input
                  value={service.healthcheck.interval}
                  onChange={(event) =>
                    onChange({ healthcheck: { ...service.healthcheck, interval: event.target.value } })
                  }
                  placeholder="30s"
                />
              </Field>
              <Field label="Timeout" className="w-24">
                <Input
                  value={service.healthcheck.timeout}
                  onChange={(event) =>
                    onChange({ healthcheck: { ...service.healthcheck, timeout: event.target.value } })
                  }
                  placeholder="10s"
                />
              </Field>
              <Field label="Retries" className="w-20">
                <Input
                  value={service.healthcheck.retries}
                  onChange={(event) =>
                    onChange({ healthcheck: { ...service.healthcheck, retries: event.target.value } })
                  }
                  placeholder="3"
                />
              </Field>
            </div>
          )}
        </div>

        <SectionLabel>Resource limits (optional)</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Field label="CPUs" className="w-28">
            <Input value={service.cpus} onChange={(event) => onChange({ cpus: event.target.value })} placeholder="0.50" />
          </Field>
          <Field label="Memory" className="w-28">
            <Input
              value={service.memory}
              onChange={(event) => onChange({ memory: event.target.value })}
              placeholder="512M"
            />
          </Field>
        </div>
      </div>
    </Panel>
  );
}
