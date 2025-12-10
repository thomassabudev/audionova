@echo off
setlocal enabledelayedexpansion

REM 🚀 AudioNova GitHub Setup Script (Windows)
REM This script helps you securely push your project to GitHub

echo 🎵 AudioNova - GitHub Setup Script (Windows)
echo ==================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Git is not installed. Please install Git first.
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git is installed

REM Check if we're in a git repository
if not exist ".git" (
    echo 📝 Initializing Git repository...
    git init
    echo ✅ Git repository initialized
) else (
    echo ✅ Already in a Git repository
)

echo.
echo 🔒 Security Check: Verifying sensitive files are ignored...

REM Check if .env files exist and are ignored
if exist ".env" (
    git check-ignore .env >nul 2>&1
    if errorlevel 1 (
        echo ❌ .env file exists but is NOT ignored by Git!
        echo This is a SECURITY RISK. Adding to .gitignore...
        echo .env >> .gitignore
        echo ✅ Added .env to .gitignore
    ) else (
        echo ✅ .env is properly ignored
    )
)

if exist "backend\.env" (
    git check-ignore backend\.env >nul 2>&1
    if errorlevel 1 (
        echo ❌ backend\.env file exists but is NOT ignored by Git!
        echo This is a SECURITY RISK. Adding to .gitignore...
        echo backend/.env >> .gitignore
        echo ✅ Added backend/.env to .gitignore
    ) else (
        echo ✅ backend/.env is properly ignored
    )
)

echo.
echo 📝 Verifying example environment files...

if not exist ".env.example" (
    echo ❌ .env.example file is missing!
    echo This file is required for other developers to set up the project.
    pause
    exit /b 1
) else (
    echo ✅ .env.example exists
)

if not exist "backend\.env.example" (
    echo ❌ backend\.env.example file is missing!
    echo This file is required for backend setup.
    pause
    exit /b 1
) else (
    echo ✅ backend/.env.example exists
)

echo.
echo 📦 Adding files to Git...
git add .

echo.
echo 📋 Files to be committed:
git status --porcelain

REM Check if there are any changes to commit
git diff --staged --quiet
if errorlevel 1 (
    echo.
    set /p "commit_message=Enter commit message (or press Enter for default): "
    if "!commit_message!"=="" (
        set "commit_message=feat: Initial commit - AudioNova music streaming platform

- Complete music streaming application with React frontend
- Node.js backend with Express and PostgreSQL  
- Advanced cover art verification system
- Trending songs with sophisticated ranking
- Multi-platform playlist import (Spotify/YouTube)
- Firebase authentication and storage
- Comprehensive testing suite
- Production-ready deployment guides"
    )
    
    git commit -m "!commit_message!"
    echo ✅ Changes committed successfully
) else (
    echo ⚠️ No changes to commit
)

echo.
echo 🐙 GitHub Repository Setup
echo ==========================

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if not errorlevel 1 (
    for /f "tokens=*" %%i in ('git remote get-url origin') do set EXISTING_REMOTE=%%i
    echo ✅ Remote origin already exists: !EXISTING_REMOTE!
    
    set /p "push_existing=Do you want to push to the existing remote? (Y/n): "
    if /i "!push_existing!"=="n" (
        echo 📝 Setup cancelled.
        pause
        exit /b 0
    )
) else (
    echo You need to create a GitHub repository first.
    echo.
    echo Steps:
    echo 1. Go to https://github.com/new
    echo 2. Repository name: audionova (or your preferred name)
    echo 3. Description: Advanced music streaming platform with cover art verification
    echo 4. Make it Public or Private (your choice)
    echo 5. DO NOT initialize with README, .gitignore, or license (we already have these)
    echo 6. Click 'Create repository'
    echo.
    
    set /p "repo_url=Enter your GitHub repository URL (e.g., https://github.com/username/audionova.git): "
    
    if "!repo_url!"=="" (
        echo ❌ Repository URL is required
        pause
        exit /b 1
    )
    
    git remote add origin "!repo_url!"
    echo ✅ Remote origin added: !repo_url!
)

echo.
echo 🚀 Pushing to GitHub...

REM Check if main branch exists, if not create it
git show-ref --verify --quiet refs/heads/main
if errorlevel 1 (
    git branch -M main
    echo ✅ Created main branch
)

REM Push to GitHub
git push -u origin main
if errorlevel 1 (
    echo ❌ Failed to push to GitHub
    echo This might be because:
    echo 1. The repository doesn't exist
    echo 2. You don't have permission to push
    echo 3. Authentication failed
    echo.
    echo Please check your GitHub repository and authentication.
    pause
    exit /b 1
) else (
    echo ✅ Successfully pushed to GitHub!
)

REM Success message
echo.
echo 🎉 SUCCESS! Your AudioNova project is now on GitHub!
echo ==================================================
echo.
for /f "tokens=*" %%i in ('git remote get-url origin') do echo ✅ Repository URL: %%i
echo ✅ All sensitive files are properly ignored
echo ✅ Environment examples are included for other developers
echo.
echo 📚 Next Steps:
echo 1. Share the repository URL with your team
echo 2. Set up GitHub Actions for CI/CD (optional)
echo 3. Configure branch protection rules (recommended)
echo 4. Set up issue templates (optional)
echo.
echo 🔒 Security Reminders:
echo • Never commit .env files
echo • Use different API keys for production
echo • Regularly rotate secrets
echo • Review the SECURITY_SETUP.md file
echo.
echo 📖 Documentation:
echo • README.md - Project overview and setup
echo • SECURITY_SETUP.md - Security configuration guide
echo • COVER_VERIFICATION_QUICKSTART.md - Get running in 5 minutes
echo.
echo ✅ Setup complete! Happy coding! 🎵

pause