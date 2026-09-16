// Per-tool metadata. This is the ONE file (together with `src/tool/`,
// `index.html`'s fallback <title>, and this repo's README) that changes
// when this template is copied to a new tool repo.

// Imports from '@mmoall/tool-kit/config' (a plain-JS-backed subpath), not
// the main '@mmoall/tool-kit' barrel — this file is also reachable from
// vite.config.ts's config-load chain, which cannot load the main barrel's
// .ts source from inside node_modules. See '@mmoall/tool-kit/config's
// source comment for why.
import { defineToolConfig } from '@mmoall/tool-kit/config';

export const toolConfig = defineToolConfig({
  slug: 'docker-compose-generator',
  name: 'Docker Compose Generator',
  description:
    'Build a valid compose.yaml from a form — services, ports, volumes, networks, healthchecks, and presets for common infra. Fast, free, and 100% client-side.',
  category: 'Docker',
  keywords: [
    'docker compose generator',
    'compose.yaml generator',
    'docker compose builder',
    'compose specification',
    'docker compose online',
    'docker compose form',
    'yaml generator',
  ],
});
