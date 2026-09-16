# Docker Compose Generator

Build a valid Compose Specification `compose.yaml` from a form — fast, free, and 100% client-side. Nothing you enter is sent over the network; everything runs in your browser.

**Live:** https://techshield-tech.github.io/docker-compose-generator/

Part of [MMOALL Developer Tools](https://mmoall.com/tools).

## Features

- Repeatable services list — add, remove, and duplicate services.
- Per service: name, image **or** build (context + Dockerfile, mutually exclusive),
  container name, ports (host:container/proto), environment variables, `env_file`
  entries, volumes (named or bind mount, with an optional read-only flag),
  `depends_on` (with an optional "wait for healthy" condition), restart policy,
  command, healthcheck (test/interval/timeout/retries), networks, and CPU/memory
  resource limits.
- One-click presets with pinned image tags and sensible defaults for
  PostgreSQL, MySQL, Redis, MongoDB, Nginx, a Node.js app, a Python app, MinIO,
  and RabbitMQ — including healthchecks where it makes sense (`pg_isready`,
  `redis-cli ping`, etc).
- Top-level `volumes:` and `networks:` sections are auto-collected from
  whatever named volumes and networks your services reference — no need to
  redeclare them.
- Inline, non-blocking validation: duplicate service names, host port
  conflicts, `depends_on` referencing an undefined service, and invalid
  service/volume/network names (Compose naming rules).
- Import: paste an existing `compose.yaml` and best-effort parse it back into
  the form. Unsupported or unusual shapes are skipped rather than causing an
  error.
- Live YAML preview with copy-to-clipboard and download as `compose.yaml`.
- Never emits the obsolete top-level `version:` key.
- Responsive down to 360px viewport width — form above, output below on
  mobile; form on the left, output on the right on wider screens.

## Embedding

This tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it
renders only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="docker-compose-generator"
  src="https://techshield-tech.github.io/docker-compose-generator/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="Docker Compose Generator"
></iframe>

<script>
  const iframe = document.getElementById('docker-compose-generator');

  // Resize the iframe to fit its content.
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'mmoall-tool:height' && data.slug === 'docker-compose-generator') {
      iframe.style.height = `${data.height}px`;
    }
    if (data && data.type === 'mmoall-tool:ready' && data.slug === 'docker-compose-generator') {
      // The tool has mounted and is ready.
    }
  });

  // Push a theme change into the iframe (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'dark' }, '*');
</script>
```

### Contract

- `?embed=1` in the URL renders only the tool (no chrome), transparent
  background.
- `?theme=light` / `?theme=dark` sets the initial theme; otherwise it follows
  `prefers-color-scheme`.
- The page listens for `window.postMessage({type:'mmoall-tool:theme', theme})`
  from the parent frame to change theme at runtime. Only messages whose
  `event.origin` is `https://mmoall.com`, `https://www.mmoall.com`, or
  `http://localhost:3000` are accepted.
- On mount (embed mode only), the page posts
  `{type:'mmoall-tool:ready', slug:'docker-compose-generator'}` to `window.parent`.
- Whenever its rendered height changes (embed mode only), the page posts
  `{type:'mmoall-tool:height', slug:'docker-compose-generator', height}` to
  `window.parent`.

## Local development

```bash
bun install
bun dev
```

Build for production:

```bash
bun run build
```

Deployment to GitHub Pages happens automatically via
`.github/workflows/deploy.yml` on every push to `main`.

## License

MIT — see [LICENSE](./LICENSE).
