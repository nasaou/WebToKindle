# WebToKindle (Cloudflare Workers + Workflows) 📚☁️

Send any web page to your Kindle as a clean PDF. The Worker orchestrates a Cloudflare Browser session to render a page to PDF, caches the result in KV, and can email it via Resend. ✉️🖨️

![alt](/public/image.png)

## What this project does ✅

- Exposes a POST `/send` endpoint that accepts `{ url, email }`.
- Starts a Cloudflare Workflow that:
  - Checks KV (`ARTICLE_CACHE`) to see if the page PDF is already cached.
  - If not cached, calls a Durable Object (`BrowserController`) to launch the Cloudflare Browser and render a PDF, then stores it in KV.
  - Logs progress and (optionally) sends the PDF by email.

## Tech stack 🧰

- Cloudflare Workers (TypeScript)
- Cloudflare Workflows (durable execution)
- Durable Objects (stateful orchestrator for the Browser session)
- Cloudflare Browser Rendering (`@cloudflare/puppeteer`)
- Cloudflare KV (PDF caching)
- Zod (request validation)
- Resend (optional email delivery)

## Quick start (dev) ⚙️

1. Install deps

```
npm i
```

2. Configure secrets (optional, for email)

```
wrangler secret put RESEND_KEY
wrangler secret put FROM_EMAIL
```

3. Run remote dev (Workflows require Cloudflare’s remote runtime)

```
wrangler dev --remote
```

4. Call the endpoint

```
curl -X POST http://127.0.0.1:8787/send \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","email":"your-kindle@kindle.com"}'
```

5. Observe logs

```
wrangler tail | cat
```

## Deploy 🚀

Durable Objects require a migration. This repo uses SQLite-backed DOs for the Free plan.

- `wrangler.jsonc` includes:

```
"durable_objects": { "bindings": [{ "name": "BROWSER_CONTROLLER", "class_name": "BrowserController" }] },
"migrations": [{ "tag": "v1", "new_sqlite_classes": ["BrowserController"] }]
```

Deploy:

```
wrangler deploy
```

## Configuration & bindings 🔗

- Workflows

```
"workflows": [{ "name": "WebToKindle-starter", "binding": "WORKFLOW", "class_name": "Workflow" }]
```

- Browser Rendering

```
"browser": { "binding": "BROWSER" }
```

- KV (preview + prod IDs)

```
"kv_namespaces": [{
  "binding": "ARTICLE_CACHE",
  "id": "9300a78b8a2c4002955c8ecc7d44c3f0",
  "preview_id": "def69d105993440e80dfb8fdee031c19"
}]
```

## Endpoint 🛣️

- POST `/send`
  - Body: `{ url: string, email: string }`
  - Returns: Workflow id + status snapshot

## Notable implementation details 🧩

- Validation with Zod in `src/index.ts`.
- Workflow logic in `src/workflow.ts`:
  - Step logs for cache check, render, and send.
  - Disposes the Durable Object stub after use to avoid RPC warnings.
- Browser Controller in `src/browser.ts`:
  - Launches `@cloudflare/puppeteer` with a keep-alive and alarm.
  - Guards CMP clicker (skips if `page.$x` isn’t available in the Cloudflare runtime).
  - Stores PDFs in KV with TTL.

## What I learned building this 📝

- Cloudflare Workflows
  - Defining a workflow inside a Worker via `workflows` with `class_name`.
  - The `--remote` requirement and why `(workflow.not_found)` appears otherwise.
  - Using step boundaries and logs to trace long-running orchestration.
- Durable Objects
  - Creating a DO binding and running migrations (Free plan → `new_sqlite_classes`).
  - Managing lifecycle and avoiding RPC warnings by explicitly calling `dispose()` on stubs.
- KV Storage
  - Binding a namespace with both `id` and `preview_id` and knowing where dev writes go.
  - Caching PDFs by URL keys, and listing keys with `wrangler kv:key list`.
- Cloudflare Browser Rendering
  - Launching `@cloudflare/puppeteer` in a DO for reuse with keep-alive + alarms.
  - Handling API differences from Puppeteer (`page.$x` guard) and failing gracefully when CMP click isn’t available.
- Worker ergonomics
  - Validating inputs with Zod, returning useful 4xx errors for invalid requests, and catching unexpected errors for 5xx.
  - Using `wrangler tail` and dashboard Observability for end-to-end debugging.
- Migrations & Bindings
  - How config edits (e.g., adding `class_name`, DO migrations) require restarting dev sessions or new deploys.

## Project layout (high level) 🗂️

```
public/           # Static UI (form posts to /send)
  index.html
  styles.css
  app.js
src/
  index.ts        # Worker entry (validates body, starts Workflow)
  workflow.ts     # Workflow steps (KV check → render → cache → send)
  browser.ts      # Durable Object for browser session & PDF rendering
  email.ts        # Resend email helper (optional)
```
