// Pure data types for the Docker Compose form, plus small factory functions
// for empty rows. Tool-specific.

import { genId } from './id';

export type SourceMode = 'image' | 'build';
export type RestartPolicy = 'no' | 'always' | 'on-failure' | 'unless-stopped';
export type Protocol = 'tcp' | 'udp';
export type VolumeKind = 'named' | 'bind';

export interface PortMapping {
  id: string;
  /** Host port, or empty to publish to a random host port. */
  host: string;
  container: string;
  protocol: Protocol;
}

export interface EnvVar {
  id: string;
  key: string;
  value: string;
}

export interface EnvFileEntry {
  id: string;
  path: string;
}

export interface VolumeMount {
  id: string;
  kind: VolumeKind;
  /** Named volume name, or host path for a bind mount. */
  source: string;
  target: string;
  readOnly: boolean;
}

export interface DependsOnEntry {
  id: string;
  service: string;
  /** When true, emits `condition: service_healthy` instead of `service_started`. */
  waitForHealthy: boolean;
}

export interface NetworkRef {
  id: string;
  name: string;
}

export interface HealthCheck {
  enabled: boolean;
  /** Shell command, wrapped as `["CMD-SHELL", test]` on emit. */
  test: string;
  interval: string;
  timeout: string;
  retries: string;
}

export interface ServiceForm {
  id: string;
  name: string;
  sourceMode: SourceMode;
  image: string;
  buildContext: string;
  buildDockerfile: string;
  containerName: string;
  ports: PortMapping[];
  environment: EnvVar[];
  envFiles: EnvFileEntry[];
  volumes: VolumeMount[];
  dependsOn: DependsOnEntry[];
  restart: RestartPolicy;
  command: string;
  healthcheck: HealthCheck;
  networks: NetworkRef[];
  cpus: string;
  memory: string;
}

export function emptyHealthcheck(): HealthCheck {
  return { enabled: false, test: '', interval: '30s', timeout: '10s', retries: '3' };
}

export function emptyService(name = ''): ServiceForm {
  return {
    id: genId(),
    name,
    sourceMode: 'image',
    image: '',
    buildContext: '.',
    buildDockerfile: 'Dockerfile',
    containerName: '',
    ports: [],
    environment: [],
    envFiles: [],
    volumes: [],
    dependsOn: [],
    restart: 'unless-stopped',
    command: '',
    healthcheck: emptyHealthcheck(),
    networks: [],
    cpus: '',
    memory: '',
  };
}
