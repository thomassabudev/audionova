# Real-Time New Releases System - Deployment Guide

## System Architecture

The real-time new releases system consists of:

1. **Database**: PostgreSQL for storing songs and events
2. **Cache**: Redis for rate limiting and pub/sub
3. **Backend**: Node.js/Express server with worker processes
4. **Frontend**: React client with SSE for real-time updates

## Prerequisites

- Node.js 16+
- PostgreSQL 12+
- Redis 6+
- npm or yarn

## Installation

### 1. Database Setup

```sql
-- Create database
CREATE DATABASE vibemusic;

-- Connect to database and run schema
\c vibemusic
\i db/schema.sql
```

### 2. Environment Variables

Create a `.env` file in the backend directory:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/vibemusic
REDIS_URL=redis://localhost:6379
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
JWT_SECRET=your_jwt_secret_key
PORT=5006
```

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Start Services

```bash
# Start Redis (if not running as service)
redis-server

# Start PostgreSQL (if not running as service)
pg_ctl -D /usr/local/var/postgres start

# Start the backend server
npm start
```

## Rate Limiting Configuration

The system implements a token bucket algorithm for rate limiting:

- **Max Tokens**: 1000 per day
- **Refill Rate**: 1000 tokens per 24 hours
- **Refill Interval**: 1 day

To adjust rate limits, modify the values in the `rate_limit_tokens` table:

```sql
UPDATE rate_limit_tokens 
SET max_tokens = 2000, refill_rate = 2000 
WHERE service_name = 'jiosaavn';
```

## Cron Schedule

The fetcher worker runs every 10 minutes by default. To modify:

1. Edit `worker/fetcher.js`
2. Change the cron schedule pattern:
   ```javascript
   // Every 10 minutes
   cron.schedule('*/10 * * * *', fetchAndProcessReleases);
   
   // Every hour
   cron.schedule('0 * * * *', fetchAndProcessReleases);
   ```

## Monitoring

### Logs

All events are logged to stdout in JSON format:

```json
{
  "timestamp": "2025-11-09T10:30:00Z",
  "event": "fetch_success",
  "language": "ml",
  "page": 1,
  "count": 50
}
```

### Health Checks

- **Server Health**: `GET /api/health`
- **Database Connection**: Check logs for database errors
- **Redis Connection**: Check logs for Redis errors

## Scaling

### Horizontal Scaling

1. **Multiple Workers**: Run multiple instances of `worker/fetcher.js`
2. **Load Balancing**: Use NGINX or similar for multiple backend instances
3. **Database Connection Pool**: Adjust pool size in `worker/fetcher.js`

### Vertical Scaling

1. **Increase Rate Limits**: Modify token bucket parameters
2. **Database Optimization**: Add indexes, optimize queries
3. **Caching**: Implement additional Redis caching layers

## Troubleshooting

### Common Issues

1. **Rate Limiting**: 
   - Check `rate_limit_tokens` table
   - Monitor `fetch_rate_limited` events in logs

2. **Database Connection**:
   - Verify `DATABASE_URL` in `.env`
   - Check PostgreSQL service status

3. **Redis Connection**:
   - Verify `REDIS_URL` in `.env`
   - Check Redis service status

### Debugging

Enable debug logging by setting environment variable:

```bash
DEBUG=worker:* npm start
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

1. Start all services
2. Run integration test suite:
   ```bash
   npm run test:integration
   ```

### Manual Testing

1. Trigger manual fetch:
   ```bash
   curl -X POST http://localhost:5006/api/new-releases/fetch
   ```

2. Check new releases:
   ```bash
   curl http://localhost:5006/api/new-releases
   ```

## Security

### API Keys

- Store API keys in environment variables
- Rotate keys regularly
- Use separate keys for development and production

### Database Security

- Use strong passwords
- Limit database user permissions
- Enable SSL connections in production

### Rate Limiting

- Monitor for abuse patterns
- Implement IP-based rate limiting if needed
- Use CDN for additional protection