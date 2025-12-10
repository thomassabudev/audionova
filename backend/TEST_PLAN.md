# Real-Time New Releases System - Test Plan

## Overview

This document outlines the test plan for the real-time new releases system, covering functionality, performance, and reliability testing.

## Test Environment

- **Operating System**: Ubuntu 20.04 LTS
- **Node.js**: v16.x
- **PostgreSQL**: v12.x
- **Redis**: v6.x
- **Testing Framework**: Jest

## Test Cases

### 1. Fetcher Worker Tests

#### 1.1 Fetch New Releases
- **Description**: Verify the worker can fetch new releases from JioSaavn API
- **Preconditions**: 
  - JioSaavn API is accessible
  - Database is connected
  - Redis is running
- **Steps**:
  1. Trigger fetchAndProcessReleases()
  2. Check database for new songs
  3. Verify featured flag is set correctly
- **Expected Results**: 
  - New songs are stored in database
  - Only one song per album is marked as featured
  - Events are published to Redis

#### 1.2 Rate Limiting
- **Description**: Verify rate limiting prevents excessive API calls
- **Preconditions**: 
  - Token bucket has limited tokens
  - Worker attempts to fetch multiple times
- **Steps**:
  1. Set token bucket to 5 tokens
  2. Attempt 10 fetch operations
  3. Monitor logs for rate limit events
- **Expected Results**: 
  - Only 5 fetch operations succeed
  - 5 operations are skipped due to rate limiting
  - Appropriate log events are recorded

#### 1.3 Duplicate Detection
- **Description**: Verify system correctly identifies and handles duplicate songs
- **Preconditions**: 
  - Database contains existing songs
  - Same songs are fetched again
- **Steps**:
  1. Insert test songs into database
  2. Attempt to insert same songs again
  3. Check database for duplicates
- **Expected Results**: 
  - No duplicate entries in database
  - Existing songs are updated if metadata changed
  - Featured status is maintained correctly

### 2. API Tests

#### 2.1 Get New Releases
- **Description**: Verify API returns featured new releases
- **Preconditions**: 
  - Database contains featured songs
- **Steps**:
  1. Call GET /api/new-releases
  2. Check response structure
  3. Verify only featured songs are returned
- **Expected Results**: 
  - HTTP 200 OK
  - JSON response with songs array
  - Only one song per album in results

#### 2.2 Get Song Details
- **Description**: Verify API returns detailed song information
- **Preconditions**: 
  - Song exists in database
- **Steps**:
  1. Call GET /api/new-releases/songs/{id}
  2. Check response structure
- **Expected Results**: 
  - HTTP 200 OK
  - Complete song details returned
  - Metadata included

#### 2.3 Get Album Songs
- **Description**: Verify API returns all songs from an album
- **Preconditions**: 
  - Album exists with multiple songs
- **Steps**:
  1. Call GET /api/new-releases/albums/{name}
  2. Check response structure
- **Expected Results**: 
  - HTTP 200 OK
  - All songs from album returned
  - Songs ordered by release date

#### 2.4 Manual Fetch Trigger
- **Description**: Verify manual fetch endpoint works
- **Preconditions**: 
  - Worker is available
- **Steps**:
  1. Call POST /api/new-releases/fetch
  2. Monitor logs for fetch activity
- **Expected Results**: 
  - HTTP 200 OK
  - Fetch process initiated
  - New songs processed

### 3. Realtime Updates Tests

#### 3.1 SSE Connection
- **Description**: Verify SSE connection can be established
- **Preconditions**: 
  - Server is running
- **Steps**:
  1. Connect to /api/new-releases/events
  2. Check connection status
- **Expected Results**: 
  - Connection established
  - "connected" event received

#### 3.2 Real-time Updates
- **Description**: Verify new releases are pushed to connected clients
- **Preconditions**: 
  - Client connected via SSE
  - New song is detected
- **Steps**:
  1. Connect client to SSE
  2. Trigger new release detection
  3. Monitor client for updates
- **Expected Results**: 
  - "new_release" event received
  - Song data matches database
  - Multiple clients receive same update

### 4. Frontend Tests

#### 4.1 New Releases Display
- **Description**: Verify new releases are displayed correctly
- **Preconditions**: 
  - API returns new releases
- **Steps**:
  1. Load home page
  2. Check new releases section
- **Expected Results**: 
  - Songs displayed in grid
  - "NEW" badge shown for recent releases
  - Images loaded correctly

#### 4.2 Real-time Updates
- **Description**: Verify UI updates when new releases are detected
- **Preconditions**: 
  - SSE connection established
  - New release event triggered
- **Steps**:
  1. Load home page
  2. Trigger new release
  3. Observe UI changes
- **Expected Results**: 
  - New song appears at top of list
  - Toast notification shown
  - Animation plays

#### 4.3 Offline Mode
- **Description**: Verify offline mode works correctly
- **Preconditions**: 
  - Network connection disabled
- **Steps**:
  1. Load home page while offline
  2. Check new releases display
- **Expected Results**: 
  - Cached releases shown
  - "Offline" badge displayed
  - UI remains functional

### 5. Performance Tests

#### 5.1 Fetch Performance
- **Description**: Measure time to fetch and process releases
- **Metrics**:
  - Average fetch time: < 30 seconds
  - Database insert time: < 5 seconds
  - Memory usage: < 100MB

#### 5.2 API Response Time
- **Description**: Measure API response times
- **Metrics**:
  - GET /api/new-releases: < 500ms
  - GET /api/new-releases/songs/{id}: < 200ms
  - GET /api/new-releases/albums/{name}: < 300ms

#### 5.3 SSE Connection Scalability
- **Description**: Test SSE with multiple concurrent connections
- **Metrics**:
  - 1000 concurrent connections supported
  - Message delivery time: < 100ms
  - Memory usage per connection: < 1MB

### 6. Reliability Tests

#### 6.1 Database Failures
- **Description**: Test system behavior during database outages
- **Steps**:
  1. Stop database service
  2. Trigger fetch operation
  3. Restart database
  4. Verify recovery
- **Expected Results**: 
  - Errors logged appropriately
  - System recovers when database available
  - No data loss

#### 6.2 Redis Failures
- **Description**: Test system behavior during Redis outages
- **Steps**:
  1. Stop Redis service
  2. Trigger fetch operation
  3. Restart Redis
  4. Verify recovery
- **Expected Results**: 
  - Fallback to database-only operations
  - System recovers when Redis available
  - Real-time updates resume

#### 6.3 Network Failures
- **Description**: Test system behavior during network issues
- **Steps**:
  1. Simulate network timeout
  2. Trigger API calls
  3. Restore network
  4. Verify recovery
- **Expected Results**: 
  - Graceful error handling
  - Retry mechanisms work
  - System recovers when network restored

## Test Data

### Sample Songs
```json
[
  {
    "id": "12345",
    "name": "New Malayalam Song",
    "album": "Movie Name",
    "artists": "Artist Name",
    "release_date": "2025-11-09T00:00:00Z",
    "featured": true
  },
  {
    "id": "67890",
    "name": "Another New Song",
    "album": "Different Movie",
    "artists": "Another Artist",
    "release_date": "2025-11-08T00:00:00Z",
    "featured": true
  }
]
```

### Sample Albums
```json
[
  {
    "name": "Movie Name",
    "songs": [
      {"id": "12345", "name": "Song 1"},
      {"id": "12346", "name": "Song 2"}
    ]
  }
]
```

## Test Execution

### Automated Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- worker
npm test -- api
npm test -- frontend
```

### Manual Tests
1. Deploy to staging environment
2. Execute test cases manually
3. Document results
4. Report issues

## Monitoring

### Key Metrics
- Fetch success rate: > 95%
- API response time: < 500ms
- Database connection errors: < 1%
- Redis connection errors: < 1%

### Alerting
- Fetch failures > 5% in 10 minutes
- API response time > 1 second
- Database errors > 10 in 1 minute
- Redis errors > 10 in 1 minute

## Rollback Plan

### If Issues Found
1. Revert to previous version
2. Restore database from backup
3. Clear Redis cache
4. Restart services

### Data Recovery
1. Database backups taken daily
2. Redis snapshots taken hourly
3. Configuration backups maintained