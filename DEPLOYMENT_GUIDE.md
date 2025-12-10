# Deployment Guide for AudioNova

## Option 1: Firebase Hosting (Recommended if you can authenticate)

You've already set up the configuration files:
- `firebase.json` - Hosting configuration
- `.firebaserc` - Project configuration

To deploy:
1. Run `firebase login` and complete authentication in the browser
2. Run `firebase deploy --only hosting`
3. Your site will be available at https://audionova-abe5a.web.app

## Option 2: Vercel Deployment

1. Sign up at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm install -g vercel`
3. Run `vercel` in your project directory
4. Follow the prompts to deploy

Configuration for Vercel:
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

## Option 3: Netlify Deployment

1. Sign up at [netlify.com](https://netlify.com)
2. Install Netlify CLI: `npm install -g netlify-cli`
3. Run `netlify deploy` in your project directory
4. Follow the prompts

Configuration for Netlify:
- Build command: `npm run build`
- Publish directory: `dist`

## Option 4: Manual Deployment

1. Build your project: `npm run build`
2. Upload the contents of the `dist` folder to any static hosting provider
3. Make sure to configure redirects to point all routes to index.html for client-side routing to work

## Troubleshooting Firebase Authentication

If you continue to have issues with Firebase authentication:
1. Try clearing Firebase CLI credentials: `firebase logout` then `firebase login`
2. Make sure you're using the same Google account that owns the Firebase project
3. Check if you have the necessary permissions on the Firebase project