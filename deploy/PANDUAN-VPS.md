# Panduan VPS HYRO — urutan yang benar (Bahasa Indonesia)

Dokumen ini untuk **menghindari langkah terbalik** (misalnya langsung `git pull` padahal `.env.prod` masih salah, atau `cp` template sehingga secret hilang).

**Aturan emas:**

1. **Cek & perbaiki `.env.prod` dulu**
2. Baru **pull kode** (kalau perlu)
3. Baru **rebuild / restart** Docker
4. Baru **tes dari PC** (`hyro login`, `hyro chat`, dll.)

---

## 1. SSH ke VPS

Dari PowerShell di PC:

```powershell
ssh root@IP-VPS-KAMU
```

Ganti `IP-VPS-KAMU` dengan IP server (contoh: `159.223.156.212`).

Masuk ke folder project:

```bash
cd ~/hyro
```

---

## 2. File env — apa itu & di mana

| File | Fungsi |
|------|--------|
| `~/hyro/.env.prod` | **Secret production** — dipakai Docker saat API jalan |
| `deploy/.env.prod.example` | **Template kosong** — hanya untuk pertama kali |

**PENTING:** Jangan jalankan `cp deploy/.env.prod.example .env.prod` kalau `.env.prod` **sudah ada** — itu **menimpa** JWT, password DB, dan API key kamu.

### Cek apakah file sudah ada

```bash
cd ~/hyro
ls -la .env.prod
```

- Ada → lanjut **edit** (bagian 3)
- Tidak ada → buat sekali saja:

```bash
cp deploy/.env.prod.example .env.prod
nano .env.prod
```

---

## 3. Buka & edit `.env.prod` dengan nano

```bash
cd ~/hyro
nano .env.prod
```

### Shortcut nano

| Tombol | Fungsi |
|--------|--------|
| Panah | Pindah kursor |
| `Ctrl + W` | Cari (ketik `MIMO`, `DEFAULT`, dll.) |
| `Ctrl + O` | **Simpan** → tekan Enter |
| `Ctrl + X` | Keluar |
| `Ctrl + K` | Hapus baris |

### Isi wajib — copy template ini, ganti value asli kamu

```env
# ---- Wajib (jangan kosong) ----
JWT_SECRET=isi-secret-panjang-kamu
API_KEY_PEPPER=isi-pepper-panjang-kamu
POSTGRES_PASSWORD=password-database-kamu

# ---- Model: JANGAN ditukar! ----
DEFAULT_MODEL=mimo-chat
MIMO_API_MODEL=mimo-v2.5-pro

# ---- MiMo API ----
MIMO_API_KEY=sk-...dari-dashboard-mimo...
XIAOMI_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1

# ---- Base MCP OAuth (wallet resmi) ----
BASE_MCP_URL=https://mcp.base.org
MCP_OAUTH_SUCCESS_URL=https://hyrocloud.lol/mcp

# ---- Opsional ----
GITHUB_TOKEN=ghp_...
BASE_RPC_URL=https://sepolia.base.org
```

**Jangan pakai baris `DATABASE_URL=...`** — Docker Compose membangun URL DB dari `POSTGRES_PASSWORD` otomatis.

### Cara pastikan tiap baris benar

#### Pastikan `DEFAULT_MODEL=mimo-chat`

1. `nano .env.prod`
2. `Ctrl + W` → ketik `DEFAULT_MODEL` → Enter
3. Harus tertulis persis: `DEFAULT_MODEL=mimo-chat`
4. **Bukan** `mimo-v2.5-pro` (itu nama API Xiaomi, bukan ID HYRO)

#### Pastikan `MIMO_API_MODEL=mimo-v2.5-pro`

1. `Ctrl + W` → ketik `MIMO_API_MODEL`
2. Harus: `MIMO_API_MODEL=mimo-v2.5-pro`

#### Pastikan `MIMO_API_KEY` terisi

1. `Ctrl + W` → ketik `MIMO_API_KEY`
2. Nilai tidak boleh `your-mimo-api-key-here` atau kosong
3. Ambil key dari dashboard [MiMo Token Plan](https://platform.xiaomimimo.com)

#### Pastikan `POSTGRES_PASSWORD` sama dengan DB yang sudah jalan

Kalau kamu **pernah** deploy sukses sebelumnya, password DB **harus sama** dengan dulu. Kalau lupa, coba ambil dari container yang masih jalan:

```bash
docker exec $(docker compose --env-file .env.prod -f docker-compose.api.yml ps -q postgres) printenv POSTGRES_PASSWORD
```

Copy output-nya ke `POSTGRES_PASSWORD=` di `.env.prod`.

Kalau DB baru / pertama kali, isi password kuat sendiri (simpan di tempat aman).

#### Pastikan `JWT_SECRET` & `API_KEY_PEPPER` tidak template

```bash
grep -E '^(JWT_SECRET|API_KEY_PEPPER)=' .env.prod
```

Jangan ada teks `replace-with` atau `dev-insecure`.

Generate baru (hanya kalau benar-benar perlu):

```bash
openssl rand -hex 32
```

Jalankan **dua kali** — satu untuk `JWT_SECRET`, satu untuk `API_KEY_PEPPER`.

### Simpan

`Ctrl + O` → Enter → `Ctrl + X`

### Verifikasi cepat tanpa membuka nano lagi

```bash
cd ~/hyro
grep -E '^(DEFAULT_MODEL|MIMO_API_MODEL|MIMO_API_KEY|POSTGRES_PASSWORD|JWT_SECRET)=' .env.prod | sed 's/=.*/=***/'
```

Harus muncul 5 baris (nilai disensor `***`). Kalau `MIMO_API_KEY` kosong, chat agent akan gagal.

---

## 4. Baru pull kode (kalau ada update)

**Hanya setelah** `.env.prod` sudah benar:

```bash
cd ~/hyro
git pull
```

Kalau `git pull` konflik, jangan panik — backup env dulu:

```bash
cp .env.prod .env.prod.backup
```

---

## 5. Rebuild & restart API

```bash
cd ~/hyro
docker compose --env-file .env.prod -f docker-compose.api.yml up -d --build api
```

Tunggu ~1–2 menit, lalu cek:

```bash
curl -s https://api.hyrocloud.lol/readyz
```

Harus balas JSON sukses (bukan error / timeout).

Cek container:

```bash
docker compose --env-file .env.prod -f docker-compose.api.yml ps
```

Semua harus `Up` (postgres/redis `healthy`).

Kalau API error:

```bash
docker compose --env-file .env.prod -f docker-compose.api.yml logs api --tail 50
```

---

## 6. Di PC — update CLI (setelah ada fix baru)

```powershell
cd "c:\Users\USER\Downloads\HYDRO CLOUD"
npm run build --workspace=hyro
npm install -g ./packages/cli
```

Login ulang (sync agent + token):

```powershell
hyro login
```

Cek API terjangkau:

```powershell
hyro setup api https://api.hyrocloud.lol
```

---

## 7. Connect Base MCP resmi (wallet / send / swap)

Urutan di **PC** (bukan di VPS):

```powershell
hyro login
hyro connect base-official
```

Browser terbuka → login Base Account → **Allow**.

Lalu:

```powershell
hyro mcp grant base-official
hyro run "show my wallets"
```

Atau TUI:

```powershell
hyro
chat
```

### Beda `base` vs `base-official`

| Perintah | Fungsi |
|----------|--------|
| `hyro connect base` | Baca chain / B20 di VPS (tanpa wallet OAuth) |
| `hyro connect base-official` | **Base MCP resmi** — wallet, send, swap, x402 |

---

## 8. Checklist sebelum bilang "sudah jalan"

Centang mental ini:

- [ ] `.env.prod` ada dan **tidak** ke-overwrite `cp` template
- [ ] `DEFAULT_MODEL=mimo-chat` dan `MIMO_API_MODEL=mimo-v2.5-pro`
- [ ] `MIMO_API_KEY` terisi
- [ ] `POSTGRES_PASSWORD` cocok dengan DB lama
- [ ] `curl https://api.hyrocloud.lol/readyz` OK
- [ ] PC: `hyro login` sukses
- [ ] `hyro chat` → ada jawaban (bukan `no reply` / model error)

---

## 9. Kesalahan umum

| Salah | Akibat | Perbaikan |
|-------|--------|-----------|
| `cp deploy/.env.prod.example .env.prod` padahal sudah ada | Secret hilang | Restore dari backup atau `docker exec ... printenv` |
| `DEFAULT_MODEL` & `MIMO_API_MODEL` ditukar | Model error / no reply | Tukar balik (lihat bagian 3) |
| Langsung `git pull` tanpa cek env | Deploy gagal / chat rusak | Cek env dulu (bagian 3) |
| Pakai `DATABASE_URL` di `.env.prod` | Diabaikan Docker | Pakai `POSTGRES_PASSWORD` saja |
| Lupa `hyro login` setelah ganti JWT | 401 di CLI | `hyro login` lagi |

---

## 10. Backup env (disarankan sebelum edit)

```bash
cd ~/hyro
cp .env.prod .env.prod.backup.$(date +%Y%m%d)
ls -la .env.prod*
```

Restore kalau salah edit:

```bash
cp .env.prod.backup.YYYYMMDD .env.prod
```

---

## Referensi

- Template env: `deploy/.env.prod.example`
- DNS: `deploy/DNS-NIAGAHOSTER.md`
- Base MCP docs: https://docs.base.org/agents/quickstart
- HYRO MCP page: https://hyrocloud.lol/mcp
