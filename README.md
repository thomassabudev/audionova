# 🎵 AudioNova - Advanced Music Streaming Platform

A modern, full-stack music streaming application with advanced features like cover art verification, trending analysis, and multi-platform playlist import.

## ✨ Features

### 🎧 Core Music Features
- **High-quality music streaming** with JioSaavn integration
- **Smart queue management** with drag-and-drop reordering
- **Advanced music player** with visualizer and controls
- **Playlist management** with import from Spotify/YouTube
- **Liked songs** and favorites system
- **Recently played** tracking with analytics

### 🔥 Advanced Features
- **Trending Now section** with sophisticated ranking algorithm
- **Cover art verification** system ensuring correct album artwork
- **Multi-language support** (Hindi, Tamil, Malayalam, Telugu, English)
- **Smart filtering** removing duplicates and low-quality content
- **Profile management** with custom profile pictures
- **Dark/Light mode** with smooth transitions

### 🛠️ Technical Features
- **Real-time updates** with Firebase integration
- **Responsive design** optimized for all devices
- **Performance optimized** with lazy loading and caching
- **Comprehensive testing** with unit and integration tests
- **Production-ready** with deployment guides

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Firebase project (for authentication)
- Spotify API credentials (optional, for playlist import)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/audionova.git
cd audionova
npm install
cd backend && npm install
```

### 2. Environment Setup

**Frontend (.env):**
```bash
cp .env.example .env
# Edit .env with your Firebase credentials
```

**Backend (backend/.env):**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys and database URL
```

### 3. Database Setup

```bash
cd backend
node scripts/init-cover-verification-db.js
```

### 4. Start Development

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend && npm start
```

Visit `http://localhost:3000` to see the app!

## 📁 Project Structure

```
audionova/
├── src/                          # Frontend React app
│   ├── components/              # Reusable UI components
│   ├── views/                   # Page components
│   ├── services/               # API services
│   ├── utils/                  # Utility functions
│   └── context/                # React context providers
├── backend/                     # Node.js backend
│   ├── routes/                 # API routes
│   ├── services/               # Business logic
│   ├── utils/                  # Backend utilities
│   ├── worker/                 # Background jobs
│   └── db/                     # Database migrations
├── docs/                       # Documentation
└── scripts/                    # Build and deployment scripts
```

## 🔧 Configuration

### Environment Variables

**Frontend (.env):**
- `VITE_FIREBASE_*` - Firebase configuration
- See `.env.example` for complete list

**Backend (backend/.env):**
- `DATABASE_URL` - PostgreSQL connection string
- `SPOTIFY_CLIENT_ID/SECRET` - Spotify API credentials
- `ADMIN_TOKEN` - Admin access token for cover verification
- `JWT_SECRET` - JWT signing secret
- See `backend/.env.example` for complete list

### Firebase Setup
1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication with Google/GitHub providers
3. Enable Firestore and Storage
4. Copy config to `.env` file

### Database Setup
1. Install PostgreSQL
2. Create database: `createdb vibemusic`
3. Run migrations: `node backend/scripts/init-cover-verification-db.js`

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd backend && npm test

# Cover verification tests
cd backend && node scripts/test-bad-cases.js
```

## 📚 Documentation

- **[Cover Verification System](COVER_VERIFICATION_IMPLEMENTATION.md)** - Advanced cover art verification
- **[Quick Start Guide](COVER_VERIFICATION_QUICKSTART.md)** - Get running in 5 minutes
- **[Deployment Guide](COVER_VERIFICATION_DEPLOYMENT_CHECKLIST.md)** - Production deployment
- **[API Documentation](backend/COVER_VERIFICATION_README.md)** - Complete API reference
- **[Architecture Overview](backend/COVER_VERIFICATION_ARCHITECTURE.md)** - System architecture

## 🚀 Deployment

### Development
```bash
npm run dev          # Frontend dev server
cd backend && npm start  # Backend dev server
```

### Production
```bash
npm run build        # Build frontend
cd backend && npm start  # Start backend
```

See [DEPLOYMENT_CHECKLIST.md](COVER_VERIFICATION_DEPLOYMENT_CHECKLIST.md) for detailed production deployment guide.

## 🔒 Security

- All API keys are properly secured in environment variables
- JWT authentication for backend APIs
- Firebase security rules for frontend
- Admin-only endpoints protected with tokens
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **JioSaavn API** for music data
- **Firebase** for authentication and storage
- **Spotify API** for playlist import
- **iTunes API** for cover art fallback
- **MusicBrainz** for music metadata

## 📞 Support

- 📧 Email: support@audionova.com
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/audionova/issues)
- 📖 Docs: [Documentation](docs/)

---

**Made with ❤️ by [Your Name]**