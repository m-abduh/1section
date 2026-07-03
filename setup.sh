#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/m-abduh/1section.git"
DIR="$HOME/1section"
NODE_MAJOR=24

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
ok()   { echo -e "${CYAN}[OK]${NC} $1"; }

info "Memulai deployment 1section..."
info "Direktori: $DIR"

# ── 1. System packages ──
info "Menginstall system dependencies..."
apt update && apt upgrade -y
apt install -y curl git postgresql postgresql-client redis-server

# ── 2. Node.js check ──
if ! command -v node &>/dev/null; then
  err "Node.js tidak terinstall! Install dulu via nvm: nvm install $NODE_MAJOR"
fi
NODE_CUR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_CUR" -lt "$NODE_MAJOR" ]; then
  err "Node.js versi $NODE_CUR terlalu tua. Minimal $NODE_MAJOR. Upgrade via nvm."
fi
ok "Node.js $(node -v)"

# ── 3. Start services ──
info "Menyalakan PostgreSQL & Redis..."
systemctl enable --now postgresql
systemctl enable --now redis-server

# ── 4. Clone repo ──
if [ -d "$DIR" ]; then
  info "Repo sudah ada, git pull..."
  cd "$DIR" && git pull
else
  info "Cloning repo..."
  git clone "$REPO" "$DIR"
  cd "$DIR"
fi

# ── 5. .env ──
if [ ! -f "$DIR/.env" ]; then
  err ".env tidak ditemukan di $DIR/.env! Upload dulu file .env ke VPS, lalu jalankan ulang script ini."
fi
ok ".env ditemukan"

# ── 6. Setup database ──
info "Menyiapkan database PostgreSQL..."
DB_PASS=$(grep -oP 'DB_PASSWORD=\K.*' "$DIR/.env" 2>/dev/null || echo "1section")
sudo -u postgres psql -c "CREATE USER \"1section\" WITH PASSWORD '${DB_PASS}';" 2>/dev/null || ok "User 1section sudah ada"
sudo -u postgres psql -c "CREATE DATABASE \"1section\" OWNER \"1section\";" 2>/dev/null || ok "Database 1section sudah ada"

# ── 7. Copy .env ke backend ──
cp "$DIR/.env" "$DIR/backend/.env"

# ── 8. PM2 ──
info "Menginstall PM2..."
npm install -g pm2

# ── 9. Install dependencies ──
info "Menginstall dependencies backend..."
cd "$DIR/backend" && npm ci

info "Menginstall dependencies app..."
cd "$DIR/app" && npm ci

info "Menginstall dependencies dashboard..."
cd "$DIR/dashboard" && npm ci

# ── 10. Build ──
info "Building backend..."
cd "$DIR/backend"
npx prisma generate
npm run build

info "Building app..."
cd "$DIR/app"
export NEXT_PUBLIC_API_URL=$(grep -oP 'NEXT_PUBLIC_API_URL=\K.*' "$DIR/.env" 2>/dev/null || echo "http://localhost:4000/api")
export NEXT_PUBLIC_WS_URL=$(grep -oP 'NEXT_PUBLIC_WS_URL=\K.*' "$DIR/.env" 2>/dev/null || echo "ws://localhost:4000/ws")
export NEXT_PUBLIC_GOOGLE_CLIENT_ID=$(grep -oP 'NEXT_PUBLIC_GOOGLE_CLIENT_ID=\K.*' "$DIR/.env" 2>/dev/null || echo "")
npm run build

info "Building dashboard..."
cd "$DIR/dashboard"
export NEXT_PUBLIC_API_URL=$(grep -oP 'NEXT_PUBLIC_API_URL=\K.*' "$DIR/.env" 2>/dev/null || echo "http://localhost:4000/api")
npm run build

# ── 11. Database migration ──
info "Menjalankan Prisma migrate..."
cd "$DIR/backend"
npx prisma migrate deploy

# ── 12. PM2 start via ecosystem ──
info "Memulai aplikasi dengan PM2..."
mkdir -p "$DIR/logs"
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js

# ── 13. PM2 startup (auto-restart) ──
info "Menyiapkan PM2 startup (server restart otomatis)..."
pm2 save
pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || true
systemctl enable "pm2-$USER" 2>/dev/null || true

# ── 14. Selesai ──
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment selesai!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  API  : ${CYAN}http://localhost:4000${NC}"
echo -e "  App  : ${CYAN}http://localhost:3000${NC}"
echo -e "  Dash : ${CYAN}http://localhost:3001${NC}"
echo ""
info "Semua app berjalan via PM2 dan otomatis restart saat server reboot."
info "Gunakan 'pm2 logs', 'pm2 status', 'pm2 monit' untuk monitoring."
