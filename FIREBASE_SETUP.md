# Firebase Authentication Setup Guide

## Prerequisites
- You should have a Firebase project created (Project ID: music-player-91585)

## Step-by-Step Setup

### 1. Get Your Firebase Web API Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (music-player-91585)
3. Click the gear icon (Project Settings) in the left sidebar
4. Under the "General" tab, look for the "Your apps" section
5. If you don't see a web app already created:
   - Click "Add app"
   - Select the Web icon (</>)
   - Register your app with a nickname (e.g., "music-player-web")
   - Copy the Firebase configuration values

### 2. Enable Authentication Providers

1. In Firebase Console, click "Authentication" in the left sidebar
2. Click the "Sign-in method" tab
3. Enable the following providers:
   - Google
   - GitHub

### 3. Configure Environment Variables

1. Open the [.env](file:///c:/Users/albin/OneDrive/Desktop/python/New/backend/.env) file in your project
2. Replace `your_web_api_key_here` with your actual Firebase Web API Key
3. Save the file

### 4. Test Authentication

1. Restart your development server:
   ```bash
   npm run dev
   ```
2. Navigate to the login page
3. Try signing in with Google or GitHub

## Troubleshooting

### If Login Still Doesn't Work

1. Check browser console for errors (F12 -> Console tab)
2. Verify your Firebase configuration in [.env](file:///c:/Users/albin/OneDrive/Desktop/python/New/backend/.env) file
3. Make sure you've enabled the authentication providers in Firebase Console
4. Check that you're using the Web API Key (not service account key)

### Common Issues

1. **"Firebase config not provided" warning**: This means the API key is missing or incorrect in your [.env](file:///c:/Users/albin/OneDrive/Desktop/python/New/backend/.env) file
2. **CORS errors**: Make sure you've added `http://localhost:3000` (and other local ports) to authorized domains in Firebase Console
3. **Popup blocked**: Make sure your browser isn't blocking popups for the site

## Security Note

Never share your Firebase Web API Key publicly. While it's visible in client-side code, you should still:
- Restrict the key to specific domains in Firebase Console
- Regularly rotate keys if you suspect they've been compromised