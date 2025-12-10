# chore(security): move API key to .env, add example, update config

## Description

- Move Firebase API key out of source code into .env (VITE_FIREBASE_API_KEY)
- Add .env.example with placeholders
- Update code to read import.meta.env.VITE_FIREBASE_API_KEY via src/config/api.ts
- Add .gitignore rule to exclude .env
- Add instructions to rotate key and scrub history if leaked
- Add simple secrets check script for CI

## Files Changed

- Added: .gitignore (to exclude .env files)
- Added: .env.example (committed template with placeholders)
- Added: src/config/api.ts (centralized configuration for API keys)
- Modified: src/lib/firebase.ts (updated to use config from api.ts)
- Added: scripts/check-secrets.sh (Linux/Mac secret checking script)
- Added: scripts/check-secrets.ps1 (Windows secret checking script)
- Added: DEPLOYMENT_INSTRUCTIONS.md (deployment instructions for various platforms)
- Added: SECURITY.md (security guidelines and best practices)
- Added: src/__tests__/env-config.test.js (tests for environment configuration)
- Modified: .env (replaced actual keys with placeholders)

## Migration Steps for Team

1. Copy .env.example to .env and fill in your actual values:
   ```bash
   cp .env.example .env
   ```

2. Fill in your actual Firebase configuration values in the .env file

3. Never commit .env to git (it's already in .gitignore)

4. Use import.meta.env.VITE_* for frontend environment variables

5. Run the secret checking script before committing:
   ```bash
   # Linux/Mac
   ./scripts/check-secrets.sh
   
   # Windows
   pwsh ./scripts/check-secrets.ps1
   ```

## QA Checklist

- [ ] Ensure .env is not in commit diffs
- [ ] Ensure .env.example has placeholders
- [ ] Confirm no API key string present in git log -p for recent commits
- [ ] If history scrubbed, confirm force-push coordinated
- [ ] Verify environment variables are properly loaded in development
- [ ] Test deployment with environment variables set

## If Keys Were Previously Committed

**Important**: If API keys were previously committed to the repository:

1. Immediately rotate the leaked keys at their respective providers

2. Remove from repository history using one of these methods:

### Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo first
pip install git-filter-repo

# Remove file with key from history
git filter-repo --path .env --invert-paths
```

### Using BFG

```bash
# Remove a specific file
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Important**: Force-pushing rewritten history affects all collaborators. Coordinate with the team before doing this.

## Security Note

Any environment variable prefixed with VITE_ will be bundled into the client-side JavaScript and will be visible to users. 

If an API key is sensitive (grants privileged access), do not expose it in client-side code. Instead:
1. Keep the key on the server/backend
2. Create a backend proxy endpoint that forwards requests to the API
3. Call the proxy endpoint from the frontend

## Quick One-Shot Commands

```bash
# create example and ignore
cp .env .env.example
git add .env.example
echo ".env" >> .gitignore

# stop tracking .env if accidentally added
git rm --cached .env || true

# commit changes
git add .gitignore src/config/api.ts .env.example scripts/ DEPLOYMENT_INSTRUCTIONS.md SECURITY.md src/__tests__/env-config.test.js
git commit -m "chore(security): move API key to .env and add example"
git push origin <branch>
```