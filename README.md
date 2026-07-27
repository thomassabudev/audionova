<div align="center">

<img src="public/logo.jpg" alt="AudioNova Logo" width="100" height="100" style="border-radius: 20px"/>

# 🎵 AudioNova

### A Full-Stack Music Streaming Web Application

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

**AudioNova** is a feature-rich music streaming web application with playlist management, real-time sync, an equalizer, lyrics viewer, and an admin dashboard — built as a comprehensive full-stack learning project.

[🚀 Live Demo](https://audionova-a82d3.web.app) · [🐛 Report Bug](https://github.com/thomassabudev/audionova/issues) · [✨ Request Feature](https://github.com/thomassabudev/audionova/issues)

</div>

---

## 📸 Screenshots

> _Landing page, music player, playlist editor, and admin dashboard showcasing the full feature set._

---

## ✨ Features

### 🎶 Music Playback
- **Full-featured music player** with play, pause, next, previous controls
- **Shuffle & Repeat modes** (none / repeat-one / repeat-all)
- **Expanded song player** with full-screen view
- **Queue management** — add, reorder, and clear queue
- **Audio quality selector** — choose stream quality
- **Sleep timer** — auto-stop playback after a set time
- **Keyboard shortcuts** — control playback without leaving the keyboard

### 🎛️ Audio Experience
- **Built-in Equalizer** with preset bands
- **Audio Visualizer** — animated spectrum display
- **Lyrics Viewer** — synchronized lyrics display
- **Cross-fade & playback settings**

### 📚 Library & Playlists
- **Personal Library** — manage your music collection
- **Playlist Editor** — create, edit, reorder playlists with drag & drop
- **Liked Songs** — heart any song; all saved to your account
- **Playlist Import** — import playlists from Spotify
- **Share Playlists & Songs** — share links with others
- **Drag & Drop** song ordering powered by `@dnd-kit`

### 🔍 Discovery
- **Search** — search songs, artists, albums in real-time
- **Artist View** — browse all songs by an artist
- **Album View** — full album tracklist
- **Trending Songs** — curated trending section
- **New Releases** — latest music carousel
- **Recommendations** — personalized song suggestions

### 👤 User Account
- **Firebase Authentication** — Email/Password + Google Sign-in
- **Profile Management** — update name, avatar (Cloudinary upload)
- **Real-time sync** — liked songs & playlists sync across devices via Firebase
- **Settings** — appearance, playback, notifications, accessibility, privacy

### 🛡️ Admin Dashboard
- **Full Admin Panel** — manage users, songs, playlists
- **Co-Admin Login** — separate co-admin access control
- **Play analytics** — track play counts per song
- **Content management** — upload songs and cover images
- **Rate limiting** — protect API endpoints

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI Framework |
| TypeScript | 5.8 | Type safety |
| Vite | 7 | Build tool & dev server |
| TailwindCSS | 3 | Styling |
| Framer Motion | 12 | Animations |
| React Router DOM | 7 | Client-side routing |
| Radix UI | Various | Accessible UI primitives |
| @dnd-kit | 6 | Drag & drop |
| Recharts | 2 | Analytics charts |
| Lucide React | Latest | Icons |
| React Hook Form + Zod | Latest | Form validation |
| @react-three/fiber | 9 | 3D audio visualizer |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 4 | REST API server |
| MongoDB + Mongoose | 7/9 | Primary database |
| Firebase Admin SDK | 12 | Server-side auth verification |
| JWT + bcryptjs | Latest | Authentication tokens |
| Cloudinary | 2 | Media (image/audio) storage |
| Multer | Latest | File upload handling |
| express-rate-limit | 8 | API rate limiting |
| node-cron | 3 | Scheduled tasks |
| Redis | 4 | Caching layer |

### Services & APIs
| Service | Purpose |
|---|---|
| Firebase Authentication | User login & registration |
| Firebase Firestore | Real-time data sync |
| MongoDB Atlas | User data & playlists |
| Cloudinary | Profile pictures & song covers |
| JioSaavn API | Music streaming data (primary) |
| Spotify API | Playlist import feature |

---

## 🏗️ Project Architecture

```
audionova/
├── 📁 src/                        # Frontend (React + TypeScript)
│   ├── App.tsx                    # Root app with routing
│   ├── pages/                     # Auth & landing pages
│   │   ├── LandingPage.tsx
│   │   ├── Signin.tsx
│   │   └── Register.tsx
│   ├── views/                     # Main application views
│   │   ├── HomeView.tsx           # Dashboard / home feed
│   │   ├── SearchView.tsx         # Search & discovery
│   │   ├── LibraryView.tsx        # User library
│   │   ├── LikedSongsView.tsx     # Liked songs collection
│   │   ├── ProfileView.tsx        # User profile
│   │   ├── SettingsView.tsx       # App settings
│   │   ├── AdminDashboard.tsx     # Admin panel
│   │   ├── ArtistView.tsx         # Artist page
│   │   └── AlbumView.tsx          # Album page
│   ├── components/                # 44+ reusable UI components
│   │   ├── MusicPlayer.tsx        # Bottom player bar
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── ExpandedSongPlayer.tsx # Full-screen player
│   │   ├── PlaylistEditor.tsx     # Playlist CRUD
│   │   ├── LyricsViewer.tsx       # Lyrics display
│   │   ├── EqualizerModal.tsx     # Audio equalizer
│   │   ├── AudioVisualizer.tsx    # Spectrum visualizer
│   │   └── ...
│   ├── context/                   # Global state management
│   │   ├── AuthContext.tsx        # Auth state
│   │   ├── MusicContext.tsx       # Player state
│   │   ├── SettingsContext.tsx    # App settings
│   │   └── SocialContext.tsx      # Social features
│   └── services/                  # API integration layer
│       ├── jiosaavnApi.ts         # JioSaavn music API
│       ├── musicService.ts        # Music operations
│       ├── adminApi.ts            # Admin API calls
│       ├── syncService.ts         # Firebase sync
│       ├── trendingService.ts     # Trending data
│       └── lyricsProvider.ts      # Lyrics fetching
│
├── 📁 backend/                    # Backend (Node.js + Express)
│   ├── server.js                  # Main Express server
│   ├── models/                    # MongoDB models
│   ├── routes/                    # API route handlers
│   ├── middleware/                # Auth & validation middleware
│   ├── config/                    # DB & service configs
│   ├── services/                  # Business logic
│   └── utils/                     # Helper utilities
│
├── firebase.json                  # Firebase Hosting config
├── firestore.rules                # Firestore security rules
├── .firebaserc                    # Firebase project binding
├── vite.config.ts                 # Vite build configuration
└── tailwind.config.js             # Tailwind configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher → [Download](https://nodejs.org/)
- **npm** v9 or higher
- **Firebase CLI** → `npm install -g firebase-tools`
- A **Firebase project** → [Firebase Console](https://console.firebase.google.com/)
- A **MongoDB Atlas** account → [MongoDB Atlas](https://www.mongodb.com/atlas)

### 1. Clone the Repository

```bash
git clone https://github.com/Thomassabu166/audionova.git
cd audionova
```

### 2. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd backend && npm install && cd ..
```

### 3. Configure Environment Variables

**Frontend** — create `.env` in the root directory:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_API_BASE_URL=http://localhost:5009
VITE_ADMIN_EMAIL=your_admin_email@example.com
```

**Backend** — create `backend/.env`:
```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/musicplayer

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Spotify (for playlist import)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000

# Cloudinary (for media uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Server
JWT_SECRET=your_strong_random_secret_here
FRONTEND_URL=http://localhost:5173
PORT=5009
```

> See `.env.example` for a full template.

### 4. Run the Application

```bash
# Terminal 1 — Start frontend dev server
npm run dev

# Terminal 2 — Start backend server
cd backend && npm start
```

Open **http://localhost:5173** in your browser.

---

## 🌐 Deployment

### Frontend → Firebase Hosting

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase login
firebase deploy --only hosting
```
**Live URL:** `https://your-project-id.web.app`

### Backend → Railway / Render / Koyeb

1. Push your repo to GitHub
2. Connect GitHub repo to [Railway](https://railway.app) or [Render](https://render.com)
3. Set **Root Directory** to `backend`
4. Set **Start Command** to `npm start`
5. Add all backend environment variables in the dashboard
6. Update `VITE_API_BASE_URL` in your frontend `.env` with the deployed backend URL
7. Rebuild & redeploy frontend

---

## 📜 Available Scripts

### Frontend
| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run all linters (TS, JS, CSS) |

### Backend
| Command | Description |
|---|---|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (hot reload) |
| `npm test` | Run test suite |
| `npm run setup-admin` | Initialize admin account |

---

## 🔒 Security

- Firebase Authentication for all user sessions
- JWT tokens for backend API authorization
- Firestore security rules (`firestore.rules`)
- Rate limiting on auth and API endpoints
- Environment variables for all secrets (never committed)
- CORS restricted to allowed origins in production

See [SECURITY.md](SECURITY.md) for the full security audit report.

---

## 🗺️ Roadmap

- [ ] Offline mode with service workers
- [ ] Mobile app (React Native)
- [ ] Social features — follow artists, share activity
- [ ] Collaborative playlists
- [ ] Podcast support
- [ ] Advanced audio normalization

---

## 👤 Author

**Thomas Sabu**  
BCA Student | Full-Stack Developer (Learning)

[![GitHub](https://img.shields.io/badge/GitHub-thomassabudev-181717?style=flat-square&logo=github)](https://github.com/thomassabudev)

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**⭐ Star this repo if you found it helpful!**

*Built with ❤️ as a learning project — demonstrating full-stack development, API integration, Firebase, and modern React patterns.*

</div>