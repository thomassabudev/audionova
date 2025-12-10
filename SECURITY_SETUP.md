# 🔒 Security Setup Guide

This guide helps you securely configure and deploy AudioNova with proper API key management.

## 🚨 Critical Security Rules

### ❌ NEVER COMMIT THESE FILES:
- `.env` (any environment file)
- `backend/.env`
- Any file containing API keys, passwords, or secrets
- Database files or backups with real data
- Private keys (.pem, .key files)

### ✅ ALWAYS DO THIS:
- Use `.env.example` files as templates
- Store real secrets in environment variables
- Use different secrets for development/production
- Rotate API keys regularly
- Use strong, unique passwords

## 🔑 API Key Security

### 1. Firebase Configuration
```bash
# Get from Firebase Console > Project Settings > General
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**Security Notes:**
- Firebase API keys are safe to expose in frontend (they're not secret)
- Real security comes from Firebase Security Rules
- Still use environment variables for consistency

### 2. Spotify API Credentials
```bash
# Get from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here  # KEEP SECRET!
```

**Security Notes:**
- Client ID can be public
- Client Secret MUST be kept private (backend only)
- Use different apps for dev/production

### 3. Database Credentials
```bash
# Production example
DATABASE_URL=postgresql://username:password@host:5432/database
```

**Security Notes:**
- Use strong, unique passwords
- Restrict database access by IP
- Use SSL connections in production
- Regular backups with encryption

### 4. JWT Secrets
```bash
# Generate strong secret
JWT_SECRET=your_super_secure_random_string_at_least_32_characters_long
```

**Generate secure JWT secret:**
```bash
# Method 1: OpenSSL
openssl rand -base64 32

# Method 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 3: Online (use with caution)
# https://generate-secret.vercel.app/32
```

### 5. Admin Tokens
```bash
# For cover verification admin endpoints
ADMIN_TOKEN=your_secure_admin_token_here
```

**Generate admin token:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🛡️ Environment Setup

### Development Environment

**1. Frontend (.env):**
```bash
cp .env.example .env
# Edit .env with your development Firebase config
```

**2. Backend (backend/.env):**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your development credentials
```

### Production Environment

**Never use .env files in production!** Instead:

**1. Vercel/Netlify:**
- Add environment variables in dashboard
- Use different values for production

**2. Docker:**
```dockerfile
ENV VITE_FIREBASE_API_KEY=your_production_key
ENV DATABASE_URL=your_production_db_url
```

**3. Server (PM2/systemd):**
```bash
# Set in process manager or system environment
export DATABASE_URL="postgresql://..."
export JWT_SECRET="your_production_secret"
```

## 🔐 Firebase Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public read for songs, but no write access
    match /songs/{songId} {
      allow read: if true;
      allow write: if false;
    }
    
    // Playlists are private to users
    match /playlists/{playlistId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile pictures - users can only access their own
    match /profile-pictures/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public assets (read-only)
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## 🚀 Deployment Security Checklist

### Before Deployment:
- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded secrets in code
- [ ] Different secrets for production
- [ ] Firebase Security Rules configured
- [ ] Database access restricted
- [ ] HTTPS enabled
- [ ] CORS properly configured

### After Deployment:
- [ ] Test authentication flows
- [ ] Verify API endpoints are secured
- [ ] Check Firebase console for security issues
- [ ] Monitor for unauthorized access
- [ ] Set up error monitoring (Sentry, etc.)

## 🔄 Secret Rotation

### Regular Rotation Schedule:
- **JWT Secrets**: Every 90 days
- **API Keys**: Every 180 days
- **Database Passwords**: Every 90 days
- **Admin Tokens**: Every 30 days

### Rotation Process:
1. Generate new secret
2. Update production environment
3. Deploy with new secret
4. Verify everything works
5. Revoke old secret
6. Update documentation

## 🚨 Security Incident Response

### If API Keys Are Compromised:
1. **Immediately revoke** the compromised keys
2. **Generate new keys** with different values
3. **Update all environments** with new keys
4. **Deploy immediately** to production
5. **Monitor** for unauthorized usage
6. **Review logs** for suspicious activity

### If Database Is Compromised:
1. **Change all database passwords**
2. **Review access logs**
3. **Check for data exfiltration**
4. **Notify users** if personal data affected
5. **Implement additional security measures**

## 📞 Emergency Contacts

- **Firebase Support**: [Firebase Console](https://console.firebase.google.com)
- **Spotify Developer**: [Spotify Dashboard](https://developer.spotify.com/dashboard)
- **Database Admin**: [Your DBA contact]
- **Security Team**: [Your security contact]

## 📚 Additional Resources

- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/security)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)

---

**Remember: Security is not a one-time setup, it's an ongoing process!** 🛡️