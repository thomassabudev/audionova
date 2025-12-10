# Gaana API Integration Guide

## Overview

This project now includes integration with the Gaana API alongside the existing JioSaavn API. The integration follows a unified service pattern that allows seamless access to both music services through a single interface.

## File Structure

```
src/
├── services/
│   ├── jiosaavnApi.ts      # Original JioSaavn API service
│   ├── gaanaApi.ts         # New Gaana API service (placeholder)
│   └── musicService.ts     # Unified service that combines both APIs
├── components/
│   └── APITest.tsx         # Updated test component
└── views/
    └── HomeView.tsx        # Updated to use unified service
```

## How It Works

### 1. Gaana API Service (`gaanaApi.ts`)

The Gaana API service is implemented as a placeholder due to the following limitations:

- The unofficial Gaana API requires specific Gaana URLs to fetch song details
- There is no public search endpoint available
- No official public instance is currently available

The service includes:
- Interfaces for Gaana song data structures
- Utility functions to convert Gaana data to our standard format
- Methods for search, trending songs, genre-based songs, and recommendations
- All methods now default to returning 50 songs (increased from 20)

### 2. Unified Music Service (`musicService.ts`)

The unified service provides a single interface to access both music services:

```typescript
// Search across both services (now returns 50 songs by default)
const songs = await musicService.searchSongs('query');

// Get trending songs from both services (now returns 50 songs by default)
const trending = await musicService.getTrendingSongs();

// Get Malayalam romantic songs (now returns 50 songs by default)
const romance = await musicService.getMalayalamRomanceSongs();
```

### 3. Usage in Components

The HomeView and other components now use the unified service instead of directly accessing JioSaavn API:

```typescript
// Before
const songs = await jiosaavnApi.getTrendingSongs();

// After
const songs = await musicService.getTrendingSongs();
```

## Setting Up a Working Gaana API Instance

To make the Gaana API fully functional, you would need to:

1. Clone the GaanaAPI repository:
   ```bash
   git clone https://github.com/cyberboysumanjay/GaanaAPI
   ```

2. Install dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

3. Run the API:
   ```bash
   python3 app.py
   ```

4. Deploy to a platform like Vercel or a VPS

5. Update the `API_BASE_URL` in `gaanaApi.ts` to point to your deployed instance:
   ```typescript
   const API_BASE_URL = 'https://your-deployed-gaana-api.vercel.app';
   ```

6. Uncomment the actual API call implementations in `gaanaApi.ts`

## Future Improvements

1. **Implement search functionality** in Gaana API service once a working endpoint is available
2. **Add authentication** if required by the deployed Gaana API instance
3. **Implement caching** to reduce API calls and improve performance
4. **Add error handling** for network failures and API errors
5. **Implement deduplication** for songs that might appear in both services

## Testing

Use the APITest component to verify that both services are working correctly. The component displays data from both the original JioSaavn API and the new unified service, along with information about the Gaana API placeholder status.

## Notes

- The Gaana API integration is currently in placeholder mode
- All existing functionality through JioSaavn API remains unchanged
- The unified service gracefully falls back to JioSaavn when Gaana API is not available
- The integration maintains backward compatibility with existing code
- All APIs now return 50 songs by default (increased from 20)