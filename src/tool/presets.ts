// Preset services with sensible, pinned-tag defaults for common
// infrastructure. Tool-specific.

import { genId } from './id';
import { emptyService, type EnvVar, type HealthCheck, type PortMapping, type ServiceForm, type VolumeMount } from './types';

export type PresetKind =
  | 'postgres'
  | 'mysql'
  | 'redis'
  | 'mongodb'
  | 'nginx'
  | 'node-app'
  | 'python-app'
  | 'minio'
  | 'rabbitmq';

export const PRESET_KINDS: PresetKind[] = [
  'postgres',
  'mysql',
  'redis',
  'mongodb',
  'nginx',
  'node-app',
  'python-app',
  'minio',
  'rabbitmq',
];

export const PRESET_LABELS: Record<PresetKind, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  redis: 'Redis',
  mongodb: 'MongoDB',
  nginx: 'Nginx',
  'node-app': 'Node.js app',
  'python-app': 'Python app',
  minio: 'MinIO',
  rabbitmq: 'RabbitMQ',
};

/** Picks `base`, or `base-2`, `base-3`, … — whichever isn't already taken. */
export function uniqueServiceName(base: string, existingNames: string[]): string {
  const taken = new Set(existingNames.map((n) => n.trim()).filter(Boolean));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function port(host: string, container: string): PortMapping {
  return { id: genId(), host, container, protocol: 'tcp' };
}

function env(key: string, value: string): EnvVar {
  return { id: genId(), key, value };
}

function namedVolume(source: string, target: string): VolumeMount {
  return { id: genId(), kind: 'named', source, target, readOnly: false };
}

function bindVolume(source: string, target: string, readOnly = false): VolumeMount {
  return { id: genId(), kind: 'bind', source, target, readOnly };
}

function healthy(test: string, interval = '10s', timeout = '5s', retries = '5'): HealthCheck {
  return { enabled: true, test, interval, timeout, retries };
}

export function createPresetService(kind: PresetKind, existingNames: string[]): ServiceForm {
  const base = emptyService();

  switch (kind) {
    case 'postgres':
      return {
        ...base,
        name: uniqueServiceName('postgres', existingNames),
        image: 'postgres:16-alpine',
        ports: [port('5432', '5432')],
        environment: [
          env('POSTGRES_USER', 'postgres'),
          env('POSTGRES_PASSWORD', 'postgres'),
          env('POSTGRES_DB', 'app'),
        ],
        volumes: [namedVolume('pgdata', '/var/lib/postgresql/data')],
        healthcheck: healthy('pg_isready -U postgres'),
      };

    case 'mysql':
      return {
        ...base,
        name: uniqueServiceName('mysql', existingNames),
        image: 'mysql:8.4',
        ports: [port('3306', '3306')],
        environment: [env('MYSQL_ROOT_PASSWORD', 'root'), env('MYSQL_DATABASE', 'app')],
        volumes: [namedVolume('mysqldata', '/var/lib/mysql')],
        healthcheck: healthy('mysqladmin ping -h localhost -uroot -p"$MYSQL_ROOT_PASSWORD"'),
      };

    case 'redis':
      return {
        ...base,
        name: uniqueServiceName('redis', existingNames),
        image: 'redis:7-alpine',
        ports: [port('6379', '6379')],
        volumes: [namedVolume('redisdata', '/data')],
        healthcheck: healthy('redis-cli ping'),
      };

    case 'mongodb':
      return {
        ...base,
        name: uniqueServiceName('mongodb', existingNames),
        image: 'mongo:7',
        ports: [port('27017', '27017')],
        environment: [
          env('MONGO_INITDB_ROOT_USERNAME', 'root'),
          env('MONGO_INITDB_ROOT_PASSWORD', 'root'),
        ],
        volumes: [namedVolume('mongodata', '/data/db')],
        healthcheck: healthy('mongosh --quiet --eval "db.adminCommand({ping: 1})"'),
      };

    case 'nginx':
      return {
        ...base,
        name: uniqueServiceName('nginx', existingNames),
        image: 'nginx:1.27-alpine',
        ports: [port('80', '80')],
        volumes: [bindVolume('./nginx.conf', '/etc/nginx/nginx.conf', true)],
        healthcheck: healthy('wget -qO- http://localhost/ || exit 1'),
      };

    case 'node-app':
      return {
        ...base,
        name: uniqueServiceName('app', existingNames),
        sourceMode: 'build',
        buildContext: './app',
        buildDockerfile: 'Dockerfile',
        ports: [port('3000', '3000')],
        environment: [env('NODE_ENV', 'production')],
        restart: 'unless-stopped',
      };

    case 'python-app':
      return {
        ...base,
        name: uniqueServiceName('app', existingNames),
        sourceMode: 'build',
        buildContext: './app',
        buildDockerfile: 'Dockerfile',
        ports: [port('8000', '8000')],
        environment: [env('PYTHONUNBUFFERED', '1')],
        restart: 'unless-stopped',
      };

    case 'minio':
      return {
        ...base,
        name: uniqueServiceName('minio', existingNames),
        image: 'minio/minio:RELEASE.2024-01-16T16-07-38Z',
        command: 'server /data --console-address ":9001"',
        ports: [port('9000', '9000'), port('9001', '9001')],
        environment: [
          env('MINIO_ROOT_USER', 'minioadmin'),
          env('MINIO_ROOT_PASSWORD', 'minioadmin'),
        ],
        volumes: [namedVolume('miniodata', '/data')],
        healthcheck: healthy('curl -f http://localhost:9000/minio/health/live || exit 1'),
      };

    case 'rabbitmq':
      return {
        ...base,
        name: uniqueServiceName('rabbitmq', existingNames),
        image: 'rabbitmq:3.13-management',
        ports: [port('5672', '5672'), port('15672', '15672')],
        environment: [
          env('RABBITMQ_DEFAULT_USER', 'guest'),
          env('RABBITMQ_DEFAULT_PASS', 'guest'),
        ],
        volumes: [namedVolume('rabbitmqdata', '/var/lib/rabbitmq')],
        healthcheck: healthy('rabbitmq-diagnostics -q ping'),
      };

    default: {
      // Exhaustiveness check: TypeScript errors here if a PresetKind is unhandled.
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
