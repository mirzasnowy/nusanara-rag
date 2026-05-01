# Task 08 — Production Deployment (VPS + Vercel)

## 1. Tujuan

Memindahkan sistem dari *Development Environment* (laptop lokal) ke *Production Environment* yang dapat diakses publik. Arsitektur deployment bersifat **hybrid**: frontend di-*host* serverless (Vercel), backend + database + LLM dipusatkan di VPS Linux.

---

## 2. Arsitektur Deployment

```
                  INTERNET
                     │
          ┌──────────┴───────────┐
          │                       │
          ▼                       ▼
   ┌─────────────┐       ┌──────────────────┐
   │   Vercel    │       │    VPS (Ubuntu)   │
   │  (Serverless│       │                   │
   │  CDN)       │       │  ┌─────────────┐ │
   │             │       │  │   Nginx     │ │
   │  Next.js    │       │  │  (port 80/  │ │
   │  Frontend   │◄──────┤  │   443)      │ │
   │             │  API  │  └──────┬──────┘ │
   └─────────────┘  Call │         │        │
                         │         ▼        │
                         │  ┌─────────────┐ │
                         │  │  FastAPI    │ │
                         │  │  Uvicorn    │ │
                         │  │  (:8000)    │ │
                         │  └──────┬──────┘ │
                         │         │        │
                         │    ┌────┴────┐   │
                         │    │         │   │
                         │    ▼         ▼   │
                         │ ┌───────┐ ┌────┐ │
                         │ │Postgre│ │Olla│ │
                         │ │SQL+   │ │ ma │ │
                         │ │pgvec  │ │LLM │ │
                         │ │(:5432)│ │:11 │ │
                         │ └───────┘ │434)│ │
                         │           └────┘ │
                         └──────────────────┘
```

---

## 3. Konfigurasi VPS

### A. Reverse Proxy — Nginx

FastAPI berjalan di port internal `8000`. Nginx menjadi *garda depan* yang menerima traffic HTTPS di port 443:

```nginx
server {
    listen 443 ssl;
    server_name api.nusanara.id;

    ssl_certificate     /etc/letsencrypt/live/api.nusanara.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nusanara.id/privkey.pem;

    location / {
        proxy_pass         http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_buffering    off;        # PENTING untuk SSE streaming!
        proxy_read_timeout 300s;       # Timeout panjang untuk LLM response
    }
}
```

> **`proxy_buffering off`** wajib diaktifkan agar SSE streaming tidak di-buffer oleh Nginx sebelum dikirim ke klien.

### B. Process Management — Systemd

Agar FastAPI dan Ollama tetap berjalan meski server restart:

```ini
# /etc/systemd/system/nusanara.service
[Unit]
Description=NusaNara FastAPI Backend
After=network.target

[Service]
WorkingDirectory=/opt/nusanara/backend
ExecStart=/opt/nusanara/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
User=ubuntu

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nusanara
sudo systemctl start nusanara
```

### C. Keamanan Jaringan — UFW Firewall

| Port | Protokol | Status | Alasan |
|---|---|---|---|
| 22 | TCP | BUKA | SSH akses admin |
| 80 | TCP | BUKA | HTTP → redirect ke HTTPS |
| 443 | TCP | BUKA | HTTPS frontend/API |
| 5432 | TCP | TUTUP | PostgreSQL hanya localhost |
| 11434 | TCP | TUTUP | Ollama hanya localhost |
| 8000 | TCP | TUTUP | FastAPI hanya via Nginx |

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### D. SSL/TLS — Let's Encrypt

Enkripsi *end-to-end* via Certbot:

```bash
certbot --nginx -d api.nusanara.id
```

Sertifikat auto-renew setiap 90 hari via systemd timer.

---

## 4. Migrasi Database (pg_dump + pg_restore)

Data 720 lowongan beserta **vector embedding 768 dimensi** dan **IVFFlat index** harus dipindahkan dari dev ke prod tanpa regenerasi (regenerasi ulang embedding membutuhkan waktu berjam-jam).

```bash
# Langkah 1: Dump dari localhost (dev)
pg_dump -Fc \
  -h localhost -U mirza -d nusanara_dev \
  > nusanara_backup.dump

# Langkah 2: Transfer ke VPS
scp nusanara_backup.dump ubuntu@api.nusanara.id:/tmp/

# Langkah 3: Restore di VPS
pg_restore -Fc \
  -h localhost -U postgres -d nusanara_prod \
  /tmp/nusanara_backup.dump
```

Format **binary archive** (`-Fc`) menjaga:
- Tipe data custom (`VECTOR(768)`)
- Index `IVFFlat` (tidak perlu rebuild)
- Urutan relasi tabel yang benar

---

## 5. Deployment Frontend — Vercel

Next.js di-deploy via Git push ke Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy dari direktori frontend
cd frontend/
vercel --prod
```

Environment variables di Vercel Dashboard:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_...
CLERK_SECRET_KEY                  = sk_live_...
NEXT_PUBLIC_BACKEND_URL           = https://api.nusanara.id
```

Vercel otomatis menangani:
- CDN global (edge deployment)
- HTTPS via SSL wildcard
- Rollback deployment

---

## 6. Checklist Deployment

```
[ ] VPS Ubuntu 22.04 terprovisioning
[ ] Docker PostgreSQL + pgvector berjalan di VPS
[ ] Ollama + model nomic-embed-text-v2-moe terinstal
[ ] pg_dump dari dev berhasil
[ ] pg_restore ke VPS verified (720 rows, embedding NOT NULL)
[ ] FastAPI berjalan via systemd (nusanara.service)
[ ] Nginx reverse proxy configured + tested
[ ] SSL certificate active (certbot)
[ ] UFW firewall configured
[ ] Vercel deployment live
[ ] CORS backend diset ke domain Vercel
[ ] End-to-end test: chat dari Vercel → VPS API → LLM → response
```
