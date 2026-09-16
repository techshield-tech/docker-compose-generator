// Best-effort parse of an existing compose YAML document into form state.
// Unsupported or unusual shapes are skipped rather than crashing — only
// genuinely unparsable YAML syntax throws. Tool-specific.

import { parse } from 'yaml';
import { genId } from './id';
import {
  emptyHealthcheck,
  type DependsOnEntry,
  type EnvFileEntry,
  type EnvVar,
  type HealthCheck,
  type NetworkRef,
  type PortMapping,
  type RestartPolicy,
  type ServiceForm,
  type VolumeKind,
  type VolumeMount,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function parsePortEntry(entry: unknown): PortMapping | null {
  if (typeof entry === 'number') {
    return { id: genId(), host: '', container: String(entry), protocol: 'tcp' };
  }

  if (typeof entry === 'string') {
    let value = entry.trim();
    let protocol: 'tcp' | 'udp' = 'tcp';
    const protocolMatch = value.match(/\/(tcp|udp)$/i);
    if (protocolMatch) {
      protocol = protocolMatch[1].toLowerCase() === 'udp' ? 'udp' : 'tcp';
      value = value.slice(0, value.length - protocolMatch[0].length);
    }
    const parts = value.split(':').filter(Boolean);
    if (parts.length === 0) return null;
    if (parts.length === 1) {
      return { id: genId(), host: '', container: parts[0], protocol };
    }
    const container = parts[parts.length - 1];
    const host = parts[parts.length - 2];
    return { id: genId(), host, container, protocol };
  }

  if (isRecord(entry)) {
    const target = asString(entry.target);
    if (target === '') return null;
    const published = asString(entry.published);
    const protocol: 'tcp' | 'udp' = entry.protocol === 'udp' ? 'udp' : 'tcp';
    return { id: genId(), host: published, container: target, protocol };
  }

  return null;
}

function parseEnvironment(value: unknown): EnvVar[] {
  if (Array.isArray(value)) {
    return value.flatMap((item): EnvVar[] => {
      if (typeof item !== 'string') return [];
      const eq = item.indexOf('=');
      if (eq === -1) return [{ id: genId(), key: item, value: '' }];
      return [{ id: genId(), key: item.slice(0, eq), value: item.slice(eq + 1) }];
    });
  }
  if (isRecord(value)) {
    return Object.entries(value).map(([key, v]) => ({ id: genId(), key, value: asString(v) }));
  }
  return [];
}

function parseEnvFile(value: unknown): EnvFileEntry[] {
  if (typeof value === 'string') return [{ id: genId(), path: value }];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((path) => ({ id: genId(), path }));
  }
  return [];
}

function parseVolumeEntry(entry: unknown): VolumeMount | null {
  if (typeof entry === 'string') {
    const parts = entry.split(':');
    let readOnly = false;
    if (parts.length > 2 && (parts[parts.length - 1] === 'ro' || parts[parts.length - 1] === 'rw')) {
      readOnly = parts.pop() === 'ro';
    }
    if (parts.length < 2) return null;
    const target = parts.pop() as string;
    const source = parts.join(':');
    const kind: VolumeKind =
      source.startsWith('.') || source.startsWith('/') || source.startsWith('~') ? 'bind' : 'named';
    return { id: genId(), kind, source, target, readOnly };
  }

  if (isRecord(entry)) {
    const target = asString(entry.target);
    if (target === '') return null;
    const type = asString(entry.type);
    const source = asString(entry.source);
    return { id: genId(), kind: type === 'bind' ? 'bind' : 'named', source, target, readOnly: entry.read_only === true };
  }

  return null;
}

function parseDependsOn(value: unknown): DependsOnEntry[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === 'string')
      .map((service) => ({ id: genId(), service, waitForHealthy: false }));
  }
  if (isRecord(value)) {
    return Object.entries(value).map(([service, condition]) => ({
      id: genId(),
      service,
      waitForHealthy: isRecord(condition) && condition.condition === 'service_healthy',
    }));
  }
  return [];
}

function parseNetworks(value: unknown): NetworkRef[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').map((name) => ({ id: genId(), name }));
  }
  if (isRecord(value)) {
    return Object.keys(value).map((name) => ({ id: genId(), name }));
  }
  return [];
}

function parseHealthcheck(value: unknown): HealthCheck {
  const healthcheck = emptyHealthcheck();
  if (!isRecord(value)) return healthcheck;

  healthcheck.enabled = true;

  const test = value.test;
  if (typeof test === 'string') {
    healthcheck.test = test;
  } else if (Array.isArray(test)) {
    const items = test.filter((t): t is string => typeof t === 'string');
    healthcheck.test = items[0] === 'CMD-SHELL' || items[0] === 'CMD' ? items.slice(1).join(' ') : items.join(' ');
  }

  if (typeof value.interval === 'string') healthcheck.interval = value.interval;
  if (typeof value.timeout === 'string') healthcheck.timeout = value.timeout;
  if (value.retries !== undefined) healthcheck.retries = asString(value.retries);

  return healthcheck;
}

function parseCommand(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string').join(' ');
  }
  return '';
}

const RESTART_VALUES: readonly string[] = ['no', 'always', 'on-failure', 'unless-stopped'];

function parseRestart(value: unknown): RestartPolicy {
  return typeof value === 'string' && RESTART_VALUES.includes(value) ? (value as RestartPolicy) : 'no';
}

function parseResourceLimits(value: unknown): { cpus: string; memory: string } {
  if (!isRecord(value) || !isRecord(value.resources) || !isRecord(value.resources.limits)) {
    return { cpus: '', memory: '' };
  }
  const limits = value.resources.limits;
  return { cpus: asString(limits.cpus), memory: asString(limits.memory) };
}

/**
 * Parses `source` as YAML and converts any `services:` mapping it contains
 * into form state. Throws only when `source` is not valid YAML at all —
 * every recognized-but-unusual field shape is skipped instead of failing.
 */
export function parseComposeYaml(source: string): ServiceForm[] {
  const doc: unknown = parse(source);
  if (!isRecord(doc) || !isRecord(doc.services)) {
    return [];
  }

  const services: ServiceForm[] = [];

  for (const [name, raw] of Object.entries(doc.services)) {
    if (!isRecord(raw)) continue;

    const service: ServiceForm = {
      id: genId(),
      name,
      sourceMode: 'image',
      image: '',
      buildContext: '.',
      buildDockerfile: 'Dockerfile',
      containerName: asString(raw.container_name),
      ports: Array.isArray(raw.ports)
        ? raw.ports.map(parsePortEntry).filter((p): p is PortMapping => p !== null)
        : [],
      environment: parseEnvironment(raw.environment),
      envFiles: parseEnvFile(raw.env_file),
      volumes: Array.isArray(raw.volumes)
        ? raw.volumes.map(parseVolumeEntry).filter((v): v is VolumeMount => v !== null)
        : [],
      dependsOn: parseDependsOn(raw.depends_on),
      restart: parseRestart(raw.restart),
      command: parseCommand(raw.command),
      healthcheck: parseHealthcheck(raw.healthcheck),
      networks: parseNetworks(raw.networks),
      cpus: '',
      memory: '',
    };

    if (typeof raw.image === 'string') {
      service.sourceMode = 'image';
      service.image = raw.image;
    } else if (isRecord(raw.build)) {
      service.sourceMode = 'build';
      service.buildContext = asString(raw.build.context) || '.';
      service.buildDockerfile = asString(raw.build.dockerfile) || 'Dockerfile';
    } else if (typeof raw.build === 'string') {
      service.sourceMode = 'build';
      service.buildContext = raw.build;
    }

    const limits = parseResourceLimits(raw.deploy);
    service.cpus = limits.cpus;
    service.memory = limits.memory;

    services.push(service);
  }

  return services;
}
