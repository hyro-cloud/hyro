# HYRO Cloud — Going Live

HYRO has three deployable pieces. Pick a host per piece (mix & match):

| Piece | What it needs | Easiest host |
| --- | --- | --- |
| **Web** (`web/`, Next.js) | Static/SSR Node | **Vercel** (free) |
| **API** (`packages/api`, Fastify) | Node server + **Postgres(pgvector)** + **Redis** | **Render** (blueprint) |
| **CLI** (`packages/cli`, `hyro`) | npm registry | **npm publish** |

Everything here is already wired: `/healthz` + `/readyz` health checks, `PORT` env support, a root `Dockerfile`, `render.yaml`, `web/Dockerfile`, and `docker-compose.prod.yml`.

> What you must do yourself (needs your accounts / money / DNS): create the host accounts, paste secrets/model keys, and point `hyrocloud.lol` DNS. I can't log into your cloud or change DNS.

---

## 0. Prerequisites
1. Push the repo to GitHub (`git push`). Auto-deploy hosts watch GitHub.
2. You control DNS for **hyrocloud.lol**.
3. Generate two secrets: `openssl rand -hex 32` (one for `JWT_SECRET`, one for `API_KEY_PEPPER`).

---

## Path A — Vercel (web) + Render (API) — recommended

### A1. API + DB + Redis on Render (one blueprint)
1. Render → **New → Blueprint** → connect the repo. Render reads [`render.yaml`](render.yaml) and provisions: `hyro-api` (Docker), `hyro-db` (Postgres 16 w/ pgvector), `hyro-redis`.
2. `JWT_SECRET` and `API_KEY_PEPPER` are auto-generated. Add model keys in the dashboard if you have them: `ANTHROPIC_API_KEY`, etc.
3. First deploy runs `migrate` automatically (`preDeployCommand`). Optional one-time demo data: open the `hyro-api` shell → `node packages/api/dist/db/seed.js`.
4. Add custom domain **api.hyrocloud.lol** to `hyro-api` → Render shows a CNAME to add in DNS.
5. Verify: `https://api.hyrocloud.lol/readyz` → `{"status":"ok","db":true,"redis":true}`.

### A2. Web on Vercel
1. Vercel → **Add New → Project** → import the repo.
2. Set **Root Directory = `web`** (Framework auto-detected: Next.js). No build overrides needed.
3. Deploy, then add domain **hyrocloud.lol** (+ `www`) → set the DNS records Vercel shows.
4. (Optional, only if you later wire the web console to the live API) add env `NEXT_PUBLIC_API_URL=https://api.hyrocloud.lol`.

DNS summary: `hyrocloud.lol` → Vercel · `api.hyrocloud.lol` → Render.

---

## Path B — Railway (all-in-one)
1. Railway → New Project → Deploy from GitHub.
2. Add plugins **PostgreSQL** and **Redis**. On the Postgres, run `CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS citext;` (or let the migration do it).
3. API service: set **Dockerfile** = `./Dockerfile`. Env: `DATABASE_URL`, `REDIS_URL` (from plugins), `JWT_SECRET`, `API_KEY_PEPPER`, `PUBLIC_API_URL`, `CORS_ORIGINS`, model keys. Railway injects `PORT` (honored).
4. Pre-deploy / one-off: `node packages/api/dist/db/migrate.js`.
5. Web: separate Railway service with `web/Dockerfile`, or just use Vercel (A2).

---

## Path C — Fly.io
1. API: `fly launch --dockerfile Dockerfile` (no DB). Create Postgres elsewhere with pgvector (**Neon** is easiest) and Redis on **Upstash**.
2. `fly secrets set DATABASE_URL=… REDIS_URL=… JWT_SECRET=… API_KEY_PEPPER=… PUBLIC_API_URL=https://api.hyrocloud.lol CORS_ORIGINS=https://hyrocloud.lol`.
3. Run migrations: `fly ssh console -C "node packages/api/dist/db/migrate.js"`.
4. Web → Vercel (A2) or `web/Dockerfile` on Fly.

---

## Path D — Your own VPS (full stack, Docker Compose)
Everything (web + API + Postgres + Redis + Caddy TLS) on one box.
```bash
# On the server, with Docker installed and DNS A-records pointing here:
git clone https://github.com/hyro-cloud/hyro.git && cd hyro
cp deploy/.env.prod.example .env.prod      # fill JWT_SECRET, API_KEY_PEPPER, keys
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```
- DNS: `hyrocloud.lol`, `www.hyrocloud.lol`, `api.hyrocloud.lol` → server IP (A records).
- [`Caddyfile`](Caddyfile) gets HTTPS certs automatically. Web on `:443`, API on `api.hyrocloud.lol`.
- Logs: `docker compose -f docker-compose.prod.yml logs -f api`.

---

## CLI — publish to npm
The package name `hyro` may be taken. Use a scoped name if so.
```bash
cd packages/cli
# in package.json set "name": "@hyrocloud/cli" (scoped) if "hyro" is unavailable
npm run build
npm login
npm publish --access public
```
Users then: `npm install -g @hyrocloud/cli` → `hyro`. Point it at prod with `HYRO_API_URL=https://api.hyrocloud.lol hyro login`.

---

## Post-deploy checklist
- [ ] `GET https://api.hyrocloud.lol/healthz` → 200
- [ ] `GET https://api.hyrocloud.lol/readyz` → `db:true, redis:true`
- [ ] `https://hyrocloud.lol` loads; `/app` and `/b20` work
- [ ] `POST /v1/auth/register` creates a user (DB writable)
- [ ] Set real model keys for non-local model output
- [ ] Rotate `JWT_SECRET` / `API_KEY_PEPPER` away from any dev value

---

## Panduan DNS — hyrocloud.lol (Bahasa Indonesia)

Repo: **https://github.com/hyro-cloud/hyro**

### Rekomendasi: Web di Vercel + API di Render

| Host | Tipe | Nilai | Di mana set |
| --- | --- | --- | --- |
| `hyrocloud.lol` | **A** atau **CNAME** | Sesuai instruksi Vercel | Panel domain (Cloudflare/Namecheap/dll.) |
| `www.hyrocloud.lol` | **CNAME** | `cname.vercel-dns.com` (atau yang Vercel tampilkan) | Panel domain |
| `api.hyrocloud.lol` | **CNAME** | Hostname Render (mis. `hyro-api.onrender.com`) | Panel domain |

**Langkah Vercel (web):**
1. [vercel.com](https://vercel.com) → Import repo `hyro-cloud/hyro`
2. **Root Directory = `web`**
3. Deploy → Settings → Domains → tambah `hyrocloud.lol` + `www.hyrocloud.lol`
4. Salin record DNS yang Vercel minta → paste di registrar domain kamu
5. Tunggu hijau ✓ (5–30 menit)

**Langkah Render (API + Postgres + Redis):**
1. [render.com](https://render.com) → **New → Blueprint** → repo `hyro-cloud/hyro`
2. Render baca `render.yaml` → buat `hyro-api`, `hyro-db`, `hyro-redis`
3. Dashboard `hyro-api` → **Environment** → tambah manual:
   - `ANTHROPIC_API_KEY` (atau OpenAI/Gemini)
   - `JWT_SECRET` / `API_KEY_PEPPER` sudah auto-generate
4. Settings → **Custom Domains** → `api.hyrocloud.lol` → tambah CNAME di DNS
5. Cek: `https://api.hyrocloud.lol/readyz`

**Secret yang wajib di dashboard Render (`hyro-api`):**

| Variable | Cara isi |
| --- | --- |
| `JWT_SECRET` | Auto (Render) — jangan pakai default dev |
| `API_KEY_PEPPER` | Auto (Render) |
| `ANTHROPIC_API_KEY` | Dari console.anthropic.com |
| `OPENAI_API_KEY` | (opsional) |
| `PUBLIC_API_URL` | `https://api.hyrocloud.lol` (sudah di blueprint) |
| `CORS_ORIGINS` | `https://hyrocloud.lol,https://www.hyrocloud.lol` |

### Alternatif: Satu VPS (semua di satu server)

| Host | Tipe | Nilai |
| --- | --- | --- |
| `hyrocloud.lol` | **A** | IP publik VPS |
| `www.hyrocloud.lol` | **A** | IP publik VPS |
| `api.hyrocloud.lol` | **A** | IP publik VPS |

Di server (Ubuntu, Docker terpasang):
```bash
git clone https://github.com/hyro-cloud/hyro.git && cd hyro
bash deploy/vps-bootstrap.sh
# atau manual:
cp deploy/.env.prod.example .env.prod   # isi JWT + model keys
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```
Caddy otomatis HTTPS setelah DNS propagate.

---

## CLI — publish ke npm

Nama **`hyro`** saat ini **belum dipakai** di npm (bisa langsung publish).

```bash
npm login   # akun npm kamu
npm run cli:publish:dry   # cek dulu
npm run cli:publish       # publish
```

User install:
```bash
npm install -g hyro
HYRO_API_URL=https://api.hyrocloud.lol hyro login --register
```

Fallback scoped (kalau `hyro` sudah diambil orang):
- Ubah `"name": "@hyrocloud/cli"` di `packages/cli/package.json`
- `npm install -g @hyrocloud/cli`

## Production env reference
See [`.env.example`](.env.example). Critical in prod: `NODE_ENV=production`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `API_KEY_PEPPER`, `PUBLIC_API_URL`, `CORS_ORIGINS`. The API **refuses to boot** in production if `JWT_SECRET` is left at its dev default.
