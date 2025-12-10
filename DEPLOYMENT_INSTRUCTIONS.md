# Deployment Instructions

This document provides instructions for deploying the application to various platforms while properly managing environment variables.

## Environment Variables

Before deploying, make sure to set the following environment variables in your deployment platform:

### Frontend Variables (Vite)
- `VITE_FIREBASE_API_KEY` - Your Firebase Web API Key
- `VITE_FIREBASE_AUTH_DOMAIN` - Your Firebase Auth Domain
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase Project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase Storage Bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase Messaging Sender ID
- `VITE_FIREBASE_APP_ID` - Your Firebase App ID

### Backend Variables
- `SPOTIFY_CLIENT_ID` - Your Spotify Client ID
- `SPOTIFY_CLIENT_SECRET` - Your Spotify Client Secret
- `JWT_SECRET` - Your JWT Secret (generate a strong secret)
- `DATABASE_URL` - Your PostgreSQL Database URL (if using database)
- `REDIS_URL` - Your Redis URL (if using Redis)

## Platform-Specific Instructions

### Vercel

1. Go to your project settings in the Vercel dashboard
2. Navigate to "Environment Variables"
3. Add each environment variable with its corresponding value
4. Select the environments (Production, Preview, Development) where each variable should be available
5. Redeploy your application for the changes to take effect

### Netlify

1. Go to your site settings in the Netlify dashboard
2. Navigate to "Build & deploy" → "Environment"
3. Click "Edit variables"
4. Add each environment variable with its corresponding value
5. Save and redeploy your site

### Heroku

1. Install the Heroku CLI if you haven't already
2. Log in to Heroku: `heroku login`
3. Set environment variables using the CLI:
   ```bash
   heroku config:set VITE_FIREBASE_API_KEY=your_api_key_here
   heroku config:set SPOTIFY_CLIENT_ID=your_client_id_here
   # Repeat for all required variables
   ```
4. Deploy your application

### Docker/Server Deployment

When deploying with Docker or on a server:

1. Set environment variables in your runtime environment
2. Never bake secrets into Docker images
3. Use environment variable files or runtime configuration

Example with Docker:
```bash
docker run -e VITE_FIREBASE_API_KEY=your_api_key_here \
           -e SPOTIFY_CLIENT_ID=your_client_id_here \
           your-app-image
```

## Security Notes

1. **Never commit API keys to source control** - Always use environment variables
2. **Client-side exposure** - Any environment variable prefixed with `VITE_` will be bundled into the client-side JavaScript and visible to users
3. **Sensitive keys** - If an API key grants privileged access, keep it on the server and create a backend proxy endpoint
4. **Key rotation** - Regularly rotate your API keys and update them in your deployment platform

## CI/CD Integration

To automatically check for secrets in your CI/CD pipeline:

1. Add the secret checking script to your build process:
   ```bash
   ./scripts/check-secrets.sh  # Linux/Mac
   pwsh ./scripts/check-secrets.ps1  # Windows
   ```
2. The build will fail if potential secrets are found in the source code

## Troubleshooting

If you encounter issues with environment variables:

1. Verify all required variables are set in your deployment platform
2. Check that variable names match exactly (case-sensitive)
3. Ensure no extra spaces or characters in variable values
4. Confirm that environment variables are available in the correct environments (Production, Preview, etc.)