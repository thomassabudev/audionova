#!/bin/bash

# 🚀 AudioNova GitHub Setup Script
# This script helps you securely push your project to GitHub

echo "🎵 AudioNova - GitHub Setup Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if git is installed
if ! command -v git &> /dev/null; then
    print_error "Git is not installed. Please install Git first."
    exit 1
fi

print_status "Git is installed"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_info "Initializing Git repository..."
    git init
    print_status "Git repository initialized"
else
    print_status "Already in a Git repository"
fi

# Security check - ensure .env files are not tracked
echo ""
print_info "🔒 Security Check: Verifying sensitive files are ignored..."

# Check if .env files exist and are ignored
if [ -f ".env" ]; then
    if git check-ignore .env > /dev/null 2>&1; then
        print_status ".env is properly ignored"
    else
        print_error ".env file exists but is NOT ignored by Git!"
        echo "This is a SECURITY RISK. Adding to .gitignore..."
        echo ".env" >> .gitignore
        print_status "Added .env to .gitignore"
    fi
fi

if [ -f "backend/.env" ]; then
    if git check-ignore backend/.env > /dev/null 2>&1; then
        print_status "backend/.env is properly ignored"
    else
        print_error "backend/.env file exists but is NOT ignored by Git!"
        echo "This is a SECURITY RISK. Adding to .gitignore..."
        echo "backend/.env" >> .gitignore
        print_status "Added backend/.env to .gitignore"
    fi
fi

# Check for any accidentally tracked sensitive files
echo ""
print_info "Checking for accidentally tracked sensitive files..."

SENSITIVE_PATTERNS=("*.env" "*.key" "*.pem" "*secret*" "*password*" "config.json")
FOUND_SENSITIVE=false

for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if git ls-files | grep -i "$pattern" > /dev/null 2>&1; then
        print_warning "Found potentially sensitive files matching: $pattern"
        git ls-files | grep -i "$pattern"
        FOUND_SENSITIVE=true
    fi
done

if [ "$FOUND_SENSITIVE" = true ]; then
    echo ""
    print_error "⚠️  SECURITY WARNING: Sensitive files found in Git history!"
    echo "You may need to remove them from Git history before pushing to GitHub."
    echo "See: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository"
    echo ""
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Setup cancelled. Please review and remove sensitive files first."
        exit 1
    fi
fi

# Verify .env.example files exist
echo ""
print_info "📝 Verifying example environment files..."

if [ ! -f ".env.example" ]; then
    print_error ".env.example file is missing!"
    echo "This file is required for other developers to set up the project."
    exit 1
else
    print_status ".env.example exists"
fi

if [ ! -f "backend/.env.example" ]; then
    print_error "backend/.env.example file is missing!"
    echo "This file is required for backend setup."
    exit 1
else
    print_status "backend/.env.example exists"
fi

# Add all files to staging
echo ""
print_info "📦 Adding files to Git..."
git add .

# Show what will be committed
echo ""
print_info "📋 Files to be committed:"
git status --porcelain

# Check if there are any changes to commit
if git diff --staged --quiet; then
    print_warning "No changes to commit"
else
    # Commit changes
    echo ""
    read -p "Enter commit message (or press Enter for default): " commit_message
    if [ -z "$commit_message" ]; then
        commit_message="feat: Initial commit - AudioNova music streaming platform

- Complete music streaming application with React frontend
- Node.js backend with Express and PostgreSQL
- Advanced cover art verification system
- Trending songs with sophisticated ranking
- Multi-platform playlist import (Spotify/YouTube)
- Firebase authentication and storage
- Comprehensive testing suite
- Production-ready deployment guides"
    fi
    
    git commit -m "$commit_message"
    print_status "Changes committed successfully"
fi

# GitHub repository setup
echo ""
print_info "🐙 GitHub Repository Setup"
echo "=========================="

# Check if remote origin exists
if git remote get-url origin > /dev/null 2>&1; then
    EXISTING_REMOTE=$(git remote get-url origin)
    print_status "Remote origin already exists: $EXISTING_REMOTE"
    
    read -p "Do you want to push to the existing remote? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_info "Setup cancelled."
        exit 0
    fi
else
    echo "You need to create a GitHub repository first."
    echo ""
    echo "Steps:"
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: audionova (or your preferred name)"
    echo "3. Description: Advanced music streaming platform with cover art verification"
    echo "4. Make it Public or Private (your choice)"
    echo "5. DO NOT initialize with README, .gitignore, or license (we already have these)"
    echo "6. Click 'Create repository'"
    echo ""
    
    read -p "Enter your GitHub repository URL (e.g., https://github.com/username/audionova.git): " repo_url
    
    if [ -z "$repo_url" ]; then
        print_error "Repository URL is required"
        exit 1
    fi
    
    git remote add origin "$repo_url"
    print_status "Remote origin added: $repo_url"
fi

# Push to GitHub
echo ""
print_info "🚀 Pushing to GitHub..."

# Check if main branch exists, if not create it
if ! git show-ref --verify --quiet refs/heads/main; then
    git branch -M main
    print_status "Created main branch"
fi

# Push to GitHub
if git push -u origin main; then
    print_status "Successfully pushed to GitHub!"
else
    print_error "Failed to push to GitHub"
    echo "This might be because:"
    echo "1. The repository doesn't exist"
    echo "2. You don't have permission to push"
    echo "3. Authentication failed"
    echo ""
    echo "Please check your GitHub repository and authentication."
    exit 1
fi

# Success message
echo ""
echo "🎉 SUCCESS! Your AudioNova project is now on GitHub!"
echo "=================================================="
echo ""
print_status "Repository URL: $(git remote get-url origin)"
print_status "All sensitive files are properly ignored"
print_status "Environment examples are included for other developers"
echo ""
echo "📚 Next Steps:"
echo "1. Share the repository URL with your team"
echo "2. Set up GitHub Actions for CI/CD (optional)"
echo "3. Configure branch protection rules (recommended)"
echo "4. Set up issue templates (optional)"
echo ""
echo "🔒 Security Reminders:"
echo "• Never commit .env files"
echo "• Use different API keys for production"
echo "• Regularly rotate secrets"
echo "• Review the SECURITY_SETUP.md file"
echo ""
echo "📖 Documentation:"
echo "• README.md - Project overview and setup"
echo "• SECURITY_SETUP.md - Security configuration guide"
echo "• COVER_VERIFICATION_QUICKSTART.md - Get running in 5 minutes"
echo ""
print_status "Setup complete! Happy coding! 🎵"