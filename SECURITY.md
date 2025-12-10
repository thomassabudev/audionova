# Security Guidelines

This document outlines the security practices for managing API keys and sensitive configuration in this project.

## Environment Variables

All API keys and sensitive configuration should be stored in environment variables, not in source code.

### Current Setup

1. **Frontend Configuration**:
   - Firebase API keys and configuration are loaded from environment variables using `import.meta.env.VITE_*`
   - Configuration is centralized in `src/config/api.ts`

2. **Backend Configuration**:
   - Spotify API credentials are loaded from environment variables using `process.env.*`
   - Other sensitive configuration (JWT secret, database URLs) use environment variables

### Files

- `.env` - Local development environment variables (NOT committed to git)
- `.env.example` - Template with variable names only (committed to git)
- `.gitignore` - Excludes `.env` and other sensitive files from git
- `src/config/api.ts` - Centralized configuration for frontend
- `scripts/check-secrets.sh` - Script to check for hardcoded secrets (Linux/Mac)
- `scripts/check-secrets.ps1` - Script to check for hardcoded secrets (Windows)

## If Keys Were Previously Committed

If API keys were previously committed to the repository:

1. **Immediately rotate the leaked keys** at their respective providers
2. **Remove from repository history** using one of these methods:

### Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo first
pip install git-filter-repo

# Remove file with key from history
git filter-repo --path path/to/file/with/key --invert-paths
```

### Using BFG

```bash
# Remove a specific file
bfg --delete-files .env

# Replace text patterns
bfg --replace-text replacements.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Simple Removal (Doesn't remove from history)

```bash
# Remove from index only
git rm --cached path/to/file
git commit -m "remove secret file from index"
git push
```

**Important**: Force-pushing rewritten history affects all collaborators. Coordinate with the team before doing this.

## Deployment

See [DEPLOYMENT_INSTRUCTIONS.md](DEPLOYMENT_INSTRUCTIONS.md) for platform-specific instructions on setting environment variables.

## Client-Side Security Note

Any environment variable prefixed with `VITE_` will be bundled into the client-side JavaScript and will be visible to users. 

If an API key is sensitive (grants privileged access), do not expose it in client-side code. Instead:

1. Keep the key on the server/backend
2. Create a backend proxy endpoint that forwards requests to the API
3. Call the proxy endpoint from the frontend

## CI/CD Integration

The secret checking scripts can be integrated into your CI/CD pipeline to automatically check for hardcoded secrets:

```bash
# Linux/Mac
./scripts/check-secrets.sh

# Windows
pwsh ./scripts/check-secrets.ps1
```

The build will fail if potential secrets are found in the source code.

## QA Checklist

Before merging changes:

- [ ] Ensure `.env` is not in commit diffs
- [ ] Ensure `.env.example` has placeholders
- [ ] Confirm no API key strings present in git log -p for recent commits
- [ ] If history was scrubbed, confirm force-push was coordinated
- [ ] Verify environment variables are properly loaded in development
- [ ] Test deployment with environment variables set

## Migration Steps for Team

1. Copy `.env.example` to `.env` and fill in your actual values
2. Never commit `.env` to git (it's already in `.gitignore`)
3. Use `import.meta.env.VITE_*` for frontend environment variables
4. Use `process.env.*` for backend environment variables
5. Run the secret checking script before committing