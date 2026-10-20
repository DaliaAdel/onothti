#!/bin/bash
set -e
cd /var/www/onothti/backend
npx prisma generate
npm run build
if ! grep -q passwordRequired dist/auth/auth.service.js; then
  echo "BUILD_BAD: passwordRequired missing from dist"
  exit 1
fi
pm2 restart onothti-api --update-env
pm2 save
echo API_RESTARTED
grep -c passwordRequired dist/auth/auth.service.js
