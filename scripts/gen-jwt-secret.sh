#!/usr/bin/env bash
# Generates a random HS256 JWT signing secret: 64 random bytes, base64url (86 characters, far above the 32 needed).
#   bash scripts/gen-jwt-secret.sh                 prints  JWT_SECRET="..."   (paste into your host's environment settings)
#   bash scripts/gen-jwt-secret.sh --write         puts it into apps/api/.env without printing it
#   bash scripts/gen-jwt-secret.sh --write path    ...or into another env file
set -euo pipefail

if command -v openssl >/dev/null 2>&1; then
  secret=$(openssl rand -base64 64 | tr -d '\n=' | tr '+/' '-_')
else
  secret=$(node -e "process.stdout.write(require('crypto').randomBytes(64).toString('base64url'))")
fi

if [ "${1:-}" = "--write" ]; then
  file="${2:-apps/api/.env}"
  [ -f "$file" ] || { echo "No such file: $file" >&2; exit 1; }
  if grep -q '^JWT_SECRET=' "$file"; then
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=\"$secret\"|" "$file" && rm -f "$file.bak"
  else
    printf '\nJWT_SECRET="%s"\n' "$secret" >> "$file"
  fi
  echo "New JWT_SECRET saved to $file (not shown). Restart the API; everyone will need to sign in again."
else
  echo "JWT_SECRET=\"$secret\""
fi
