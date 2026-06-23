# Niagahoster DNS — hyrocloud.lol

Web stays on **Vercel**. API runs on your **VPS** (`159.223.156.212`).

## What to add in Niagahoster

1. Log in to [Niagahoster](https://www.niagahoster.co.id) → **Domain** → **hyrocloud.lol** → **Kelola DNS** / **DNS Management**.
2. **Do not remove** existing records for `@` / `www` that point to Vercel (website must keep working).
3. Add **one new record**:

| Type | Host / Name | Value / Points to | TTL |
| --- | --- | --- | --- |
| **A** | `api` | `159.223.156.212` | 3600 (or default) |

Result: `api.hyrocloud.lol` → your VPS.

4. Wait 5–30 minutes for propagation.
5. Verify: `nslookup api.hyrocloud.lol` should show `159.223.156.212`.

## Nameservers (apollo / athena dns-parking)

Your domain uses parking nameservers (`apollo.dns-parking.com`, `athena.dns-parking.com`).  
DNS records are still edited in the **Niagahoster client panel** for that domain — you only add the `api` A record above.

If Vercel shows DNS warnings for the apex domain, that is separate from the API subdomain. As long as `www.hyrocloud.lol` loads on Vercel, leave web DNS as-is.

## After DNS propagates — deploy API on VPS

```bash
ssh root@159.223.156.212
git clone https://github.com/hyro-cloud/hyro.git && cd hyro
cp deploy/.env.prod.example .env.prod
nano .env.prod   # paste MIMO_API_KEY, JWT secrets, POSTGRES_PASSWORD
docker compose --env-file .env.prod -f docker-compose.api.yml up -d --build
```

Open firewall ports **80** and **443** on the VPS.

### Caddy / Let's Encrypt DNS errors inside Docker

If Caddy logs show `lookup ... on 127.0.0.53:53: connection refused`, containers cannot reach the host resolver. `docker-compose.api.yml` sets public DNS (`8.8.8.8`, `1.1.1.1`) for `api` and `caddy`. After `git pull`, recreate Caddy:

```bash
docker compose -f docker-compose.api.yml up -d --force-recreate caddy
```

Verify:

```bash
docker compose -f docker-compose.api.yml exec caddy wget -qO- http://127.0.0.1/readyz
curl https://api.hyrocloud.lol/readyz
```

Verify:

```bash
curl https://api.hyrocloud.lol/readyz
```

Expected: `{"status":"ok","db":true,"redis":true}`

## CLI (your machine)

```bash
HYRO_API_URL=https://api.hyrocloud.lol hyro login --register
hyro model use mimo-chat
hyro run "hello from HYRO"
```
