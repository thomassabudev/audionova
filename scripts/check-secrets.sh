#!/usr/bin/env bash
# fail if raw API key string exists in src
echo "Checking for potential secrets in source code..."

# Check for Firebase API keys
if grep -r "AIzaSy" src/ --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.json" --include="*.env" --exclude-dir=node_modules; then
  echo "Potential Firebase API key found in source code!" && exit 1
fi

# Check for VITE_ environment variables being set directly
if grep -r "VITE_.*=.*[a-zA-Z0-9]" . --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.example" --exclude="check-secrets.sh"; then
  echo "Potential environment variable assignment found in source code!" && exit 1
fi

# Check for common API key patterns
if grep -r -i "api.*key.*[a-zA-Z0-9]" src/ --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --exclude-dir=node_modules; then
  echo "Potential API key pattern found in source code!" && exit 1
fi

# Check for Spotify client secrets
if grep -r "spotify.*secret" src/ --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --exclude-dir=node_modules; then
  echo "Potential Spotify secret found in source code!" && exit 1
fi

echo "No obvious secrets found in source code."
exit 0