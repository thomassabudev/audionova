# 🚀 GitHub Setup Instructions

Follow these steps to securely push your AudioNova project to GitHub.

## 🔒 Security First!

**CRITICAL**: Before pushing to GitHub, ensure all sensitive data is protected.

### Quick Security Check

Run the security verification script:

```bash
# Check for security issues
npm run security:check

# Or run directly
node verify-security.js
```

This will scan for:
- ✅ Proper .gitignore configuration
- ✅ No .env files tracked by Git
- ✅ No sensitive data in code
- ✅ Required example files exist

## 🎯 Method 1: Automated Setup (Recommended)

### For Windows Users:
```cmd
setup-github.bat
```

### For Mac/Linux Users:
```bash
chmod +x setup-github.sh
./setup-github.sh
```

### Using npm script:
```bash
npm run github:setup
```

The automated script will:
1. ✅ Run security checks
2. ✅ Initialize Git repository
3. ✅ Add all files to Git
4. ✅ Create initial commit
5. ✅ Help you set up GitHub remote
6. ✅ Push to GitHub

## 🛠️ Method 2: Manual Setup

### Step 1: Security Verification
```bash
npm run security:check
```
Fix any issues before proceeding.

### Step 2: Initialize Git (if not already done)
```bash
git init
```

### Step 3: Add Files
```bash
git add .
```

### Step 4: Create Initial Commit
```bash
git commit -m "feat: Initial commit - AudioNova music streaming platform

- Complete music streaming application with React frontend
- Node.js backend with Express and PostgreSQL
- Advanced cover art verification system
- Trending songs with sophisticated ranking
- Multi-platform playlist import (Spotify/YouTube)
- Firebase authentication and storage
- Comprehensive testing suite
- Production-ready deployment guides"
```

### Step 5: Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `audionova` (or your preferred name)
3. Description: `Advanced music streaming platform with cover art verification`
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### Step 6: Add Remote and Push
```bash
# Replace with your actual repository URL
git remote add origin https://github.com/yourusername/audionova.git
git branch -M main
git push -u origin main
```

## 🔐 Environment Variables Setup

### For Collaborators

When someone clones your repository, they need to set up environment variables:

**Frontend:**
```bash
cp .env.example .env
# Edit .env with actual Firebase credentials
```

**Backend:**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with actual API keys and database URL
```

### Required API Keys

**Firebase (Frontend):**
- Get from [Firebase Console](https://console.firebase.google.com)
- Project Settings → General → Your apps

**Spotify (Backend - Optional):**
- Get from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Create new app → Client ID & Secret

**Database:**
- PostgreSQL connection string
- Format: `postgresql://username:password@host:5432/database`

## 🚨 Security Checklist

Before pushing to GitHub, verify:

- [ ] ✅ `.env` files are in `.gitignore`
- [ ] ✅ No real API keys in code
- [ ] ✅ `.env.example` files have placeholder values
- [ ] ✅ No database credentials in code
- [ ] ✅ No private keys or certificates
- [ ] ✅ Security verification script passes

## 🔄 After Pushing to GitHub

### Set Up Branch Protection (Recommended)

1. Go to your repository on GitHub
2. Settings → Branches
3. Add rule for `main` branch:
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date

### Set Up GitHub Actions (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run security check
      run: npm run security:check
    
    - name: Run tests
      run: npm test
    
    - name: Build project
      run: npm run build
```

## 🤝 Team Collaboration

### For New Team Members

**Setup Instructions:**
```bash
# 1. Clone repository
git clone https://github.com/yourusername/audionova.git
cd audionova

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Set up environment variables
cp .env.example .env
cp backend/.env.example backend/.env
# Edit both .env files with actual credentials

# 4. Set up database
cd backend
node scripts/init-cover-verification-db.js

# 5. Start development
npm run dev  # Frontend
cd backend && npm start  # Backend (separate terminal)
```

### Sharing Credentials Securely

**❌ Never share via:**
- Email
- Slack/Discord messages
- Commit to Git
- Screenshots

**✅ Share via:**
- Password managers (1Password, Bitwarden)
- Encrypted files
- Secure note-sharing services
- In-person/video call

## 🆘 Troubleshooting

### "Permission denied" error
```bash
# Set up SSH key or use personal access token
# See: https://docs.github.com/en/authentication
```

### "Repository not found" error
```bash
# Check repository URL
git remote -v

# Update if needed
git remote set-url origin https://github.com/yourusername/audionova.git
```

### Security check fails
```bash
# Run detailed check
node verify-security.js

# Fix issues and try again
```

### Large files error
```bash
# Check file sizes
find . -size +100M -not -path "./node_modules/*"

# Add large files to .gitignore
echo "large-file.mp4" >> .gitignore
```

## 📚 Additional Resources

- **[GitHub Docs](https://docs.github.com)** - Official GitHub documentation
- **[Git Basics](https://git-scm.com/book)** - Learn Git fundamentals
- **[Security Guide](SECURITY_SETUP.md)** - Detailed security setup
- **[Project README](README.md)** - Project overview and setup

## 🎉 Success!

Once pushed successfully:

1. ✅ Your code is safely on GitHub
2. ✅ All sensitive data is protected
3. ✅ Team members can collaborate
4. ✅ You have backup and version control

**Repository URL**: `https://github.com/yourusername/audionova`

Share this URL with your team and start collaborating! 🚀

---

**Need help?** Check the troubleshooting section or create an issue in your repository.