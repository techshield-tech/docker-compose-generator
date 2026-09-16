// Pure conversion from form state to a Compose Specification document
// (plain object), then to YAML text. Deliberately does not emit the
// obsolete top-level `version:` key. Tool-specific.

import { stringify } from 'yaml';
import type {
  DependsOnEntry,
  EnvFileEntry,
  EnvVar,
  HealthCheck,
  NetworkRef,
  PortMapping,
  ServiceForm,
  VolumeMount,
} from './types';

function buildPort(port: PortMapping): string | null {
  const container = port.container.trim();
  if (container === '') return null;
  const host = port.host.trim();
  const suffix = port.protocol === 'udp' ? '/udp' : '';
  return host === '' ? `${container}${suffix}` : `${host}:${container}${suffix}`;
}

function buildEnvironment(vars: EnvVar[]): Record<string, string> | undefined {
  const entries = vars.filter((v) => v.key.trim() !== '');
  if (entries.length === 0) return undefined;
  const result: Record<string, string> = {};
  for (const v of entries) {
    result[v.key.trim()] = v.value;
  }
  return result;
}

function buildEnvFile(files: EnvFileEntry[]): string[] | undefined {
  const paths = files.map((f) => f.path.trim()).filter(Boolean);
  return paths.length ? paths : undefined;
}

function buildVolume(volume: VolumeMount): string | null {
  const source = volume.source.trim();
  const target = volume.target.trim();
  if (source === '' || target === '') return null;
  return volume.readOnly ? `${source}:${target}:ro` : `${source}:${target}`;
}

function buildDependsOn(deps: DependsOnEntry[]): unknown {
  const entries = deps.filter((d) => d.service.trim() !== '');
  if (entries.length === 0) return undefined;

  const needsConditionForm = entries.some((d) => d.waitForHealthy);
  if (!needsConditionForm) {
    return entries.map((d) => d.service.trim());
  }

  const result: Record<string, { condition: string }> = {};
  for (const d of entries) {
    result[d.service.trim()] = {
      condition: d.waitForHealthy ? 'service_healthy' : 'service_started',
    };
  }
  return result;
}

function buildHealthcheck(healthcheck: HealthCheck): Record<string, unknown> | undefined {
  if (!healthcheck.enabled) return undefined;

  const result: Record<string, unknown> = {};
  const test = healthcheck.test.trim();
  if (test !== '') {
    result.test = ['CMD-SHELL', test];
  }
  if (healthcheck.interval.trim() !== '') result.interval = healthcheck.interval.trim();
  if (healthcheck.timeout.trim() !== '') result.timeout = healthcheck.timeout.trim();
  if (healthcheck.retries.trim() !== '') {
    const retries = Number(healthcheck.retries);
    result.retries = Number.isFinite(retries) ? retries : healthcheck.retries.trim();
  }
  return Object.keys(result).length ? result : undefined;
}

function buildNetworks(networks: NetworkRef[]): string[] | undefined {
  const names = networks.map((n) => n.name.trim()).filter(Boolean);
  return names.length ? names : undefined;
}

function buildDeploy(cpus: string, memory: string): Record<string, unknown> | undefined {
  const trimmedCpus = cpus.trim();
  const trimmedMemory = memory.trim();
  if (trimmedCpus === '' && trimmedMemory === '') return undefined;

  const limits: Record<string, string> = {};
  if (trimmedCpus !== '') limits.cpus = trimmedCpus;
  if (trimmedMemory !== '') limits.memory = trimmedMemory;
  return { resources: { limits } };
}

function buildService(service: ServiceForm): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  if (service.sourceMode === 'build') {
    const context = service.buildContext.trim() || '.';
    const dockerfile = service.buildDockerfile.trim();
    out.build = dockerfile && dockerfile !== 'Dockerfile' ? { context, dockerfile } : { context };
  } else if (service.image.trim() !== '') {
    out.image = service.image.trim();
  }

  if (service.containerName.trim() !== '') out.container_name = service.containerName.trim();
  if (service.restart !== 'no') out.restart = service.restart;
  if (service.command.trim() !== '') out.command = service.command.trim();

  const ports = service.ports.map(buildPort).filter((p): p is string => p !== null);
  if (ports.length) out.ports = ports;

  const environment = buildEnvironment(service.environment);
  if (environment) out.environment = environment;

  const envFile = buildEnvFile(service.envFiles);
  if (envFile) out.env_file = envFile;

  const volumes = service.volumes.map(buildVolume).filter((v): v is string => v !== null);
  if (volumes.length) out.volumes = volumes;

  const dependsOn = buildDependsOn(service.dependsOn);
  if (dependsOn) out.depends_on = dependsOn;

  const healthcheck = buildHealthcheck(service.healthcheck);
  if (healthcheck) out.healthcheck = healthcheck;

  const networks = buildNetworks(service.networks);
  if (networks) out.networks = networks;

  const deploy = buildDeploy(service.cpus, service.memory);
  if (deploy) out.deploy = deploy;

  return out;
}

/** Builds the plain-object Compose document (no top-level `version:` key). */
export function buildComposeObject(services: ServiceForm[]): Record<string, unknown> {
  const servicesOut: Record<string, unknown> = {};
  const volumeNames = new Set<string>();
  const networkNames = new Set<string>();

  for (const service of services) {
    const name = service.name.trim();
    if (name === '') continue;

    servicesOut[name] = buildService(service);

    for (const volume of service.volumes) {
      const source = volume.source.trim();
      if (volume.kind === 'named' && source !== '') volumeNames.add(source);
    }
    for (const network of service.networks) {
      const name2 = network.name.trim();
      if (name2 !== '') networkNames.add(name2);
    }
  }

  const result: Record<string, unknown> = { services: servicesOut };

  if (volumeNames.size) {
    const volumesOut: Record<string, unknown> = {};
    for (const name of volumeNames) volumesOut[name] = {};
    result.volumes = volumesOut;
  }

  if (networkNames.size) {
    const networksOut: Record<string, unknown> = {};
    for (const name of networkNames) networksOut[name] = {};
    result.networks = networksOut;
  }

  return result;
}

/** Renders the form state as `compose.yaml` text. */
export function toComposeYaml(services: ServiceForm[]): string {
  const obj = buildComposeObject(services);
  return stringify(obj, { lineWidth: 0 });
}
