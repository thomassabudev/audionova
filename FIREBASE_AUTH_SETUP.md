# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for your music player application.

## Prerequisites

1. A Google account
2. Access to the Firebase Console

## Step-by-Step Setup

### 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "music-player")
4. Accept the terms and conditions
5. Click "Create project"

### 2. Register Your Web App

1. In the Firebase Console, click the gear icon next to "Project Overview" and select "Project settings"
2. In the "General" tab, click the "</>" icon to add a web app
3. Enter an app nickname (e.g., "music-player-web")
4. Check "Also set up Firebase Hosting" if you plan to host your app with Firebase
5. Click "Register app"

### 3. Get Your Firebase Configuration

After registering your app, you'll see a code snippet with your Firebase configuration. It will look like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

### 4. Update Your Environment Variables

Open the `.env` file in your project root and replace the placeholder values with your actual Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

### 5. Enable Authentication Methods

1. In the Firebase Console, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable the following sign-in providers:
   - Email/Password
   - Google

### 6. Configure Google Sign-In

1. In the "Sign-in method" tab, click on "Google"
2. Enable the provider
3. Enter your project's support email
4. Click "Save"

### 7. Configure Authorized Domains

1. In the Firebase Console, go to "Authentication" > "Settings" tab
2. In the "Authorized domains" section, add `localhost` if it's not already there
3. Add any other domains where your app will be hosted

## Testing the Setup

After completing the above steps:

1. Save your `.env` file
2. Restart your development server
3. Navigate to the sign-in page
4. You should now be able to sign in with Google or create an account with email and password

## Troubleshooting

### Common Issues

1. **"API key not valid" error**: Double-check that you've copied the correct API key from your Firebase project settings.

2. **"Unauthorized domain" error**: Make sure `localhost` is added to the authorized domains in Firebase Authentication settings.

3. **Google sign-in not working**: Ensure you've enabled Google as a sign-in provider in the Firebase Console.

### Need Help?

If you encounter any issues, check the browser console for error messages and refer to the [Firebase Authentication documentation](https://firebase.google.com/docs/auth/web/start).