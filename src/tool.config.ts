// Per-tool metadata. This is the ONE file (together with the `base` in
// vite.config.ts, index.html's <title>/meta tags, README.md, and everything
// under src/tool/) that changes when this template is copied to a sibling
// tool repo.

export type ToolCategory = 'JSON' | 'JWT' | 'SQL' | 'Docker' | 'Git' | 'Web';

export interface ToolConfig {
  /** Unique identifier used in embed postMessage payloads and URLs. */
  slug: string;
  /** Display name shown in the header. */
  name: string;
  /** Short description used for meta tags and listings. */
  description: string;
  /** One of the shared MMOALL tool categories. */
  category: ToolCategory;
  /** Keywords for search/SEO purposes. */
  keywords: string[];
}

export const toolConfig: ToolConfig = {
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
};
