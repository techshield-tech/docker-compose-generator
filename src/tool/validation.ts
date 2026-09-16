// Pure, framework-free validation of the form state against basic Compose
// rules. Non-blocking: callers surface these as inline messages, they never
// prevent generating YAML. Tool-specific.

import type { ServiceForm } from './types';

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  id: string;
  level: IssueLevel;
  message: string;
}

// Compose Specification naming rule for services, volumes and networks:
// lowercase alphanumerics plus `.`, `_`, `-`.
const NAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export function isValidComposeName(name: string): boolean {
  return NAME_PATTERN.test(name);
}

function serviceLabel(service: ServiceForm): string {
  return service.name.trim() || '(unnamed service)';
}

export function validateForm(services: ServiceForm[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const nameCounts = new Map<string, number>();
  for (const service of services) {
    const name = service.name.trim();
    if (name === '') continue;
    nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
  }
  for (const [name, count] of nameCounts) {
    if (count > 1) {
      issues.push({
        id: `dup-name-${name}`,
        level: 'error',
        message: `Service name "${name}" is used by ${count} services — names must be unique.`,
      });
    }
  }

  for (const service of services) {
    const name = service.name.trim();
    if (name !== '' && !isValidComposeName(name)) {
      issues.push({
        id: `bad-name-${service.id}`,
        level: 'error',
        message: `Service name "${name}" is invalid — use lowercase letters, numbers, ".", "_" or "-".`,
      });
    }
  }

  const hostPortUsers = new Map<string, string[]>();
  for (const service of services) {
    for (const p of service.ports) {
      const host = p.host.trim();
      if (host === '') continue;
      const users = hostPortUsers.get(host) ?? [];
      users.push(serviceLabel(service));
      hostPortUsers.set(host, users);
    }
  }
  for (const [hostPort, users] of hostPortUsers) {
    if (users.length > 1) {
      issues.push({
        id: `port-conflict-${hostPort}`,
        level: 'error',
        message: `Host port ${hostPort} is published by multiple services: ${users.join(', ')}.`,
      });
    }
  }

  const knownNames = new Set(services.map((s) => s.name.trim()).filter(Boolean));
  for (const service of services) {
    for (const dep of service.dependsOn) {
      const depName = dep.service.trim();
      if (depName === '') continue;
      if (!knownNames.has(depName)) {
        issues.push({
          id: `missing-dep-${service.id}-${dep.id}`,
          level: 'error',
          message: `Service "${serviceLabel(service)}" depends on "${depName}", which is not defined in this form.`,
        });
      }
    }
  }

  for (const service of services) {
    for (const volume of service.volumes) {
      if (volume.kind !== 'named') continue;
      const source = volume.source.trim();
      if (source !== '' && !isValidComposeName(source)) {
        issues.push({
          id: `bad-volume-${volume.id}`,
          level: 'warning',
          message: `Volume name "${source}" in service "${serviceLabel(service)}" is invalid — use lowercase letters, numbers, ".", "_" or "-".`,
        });
      }
    }
    for (const network of service.networks) {
      const name = network.name.trim();
      if (name !== '' && !isValidComposeName(name)) {
        issues.push({
          id: `bad-network-${network.id}`,
          level: 'warning',
          message: `Network name "${name}" in service "${serviceLabel(service)}" is invalid — use lowercase letters, numbers, ".", "_" or "-".`,
        });
      }
    }
  }

  return issues;
}
