# Analytics Tracking

## Overview

The Real-Time New Releases System includes comprehensive analytics tracking to monitor system performance, user engagement, and operational health.

## Tracked Events

### Fetcher Events

#### fetch_attempt
- **When**: Before each API fetch attempt
- **Data**: 
  - `language`: Language code being fetched
  - `page`: Page number
  - `timestamp`: ISO timestamp

#### fetch_success
- **When**: After successful API fetch
- **Data**:
  - `language`: Language code
  - `page`: Page number
  - `count`: Number of songs fetched
  - `timestamp`: ISO timestamp

#### fetch_rate_limited
- **When**: When rate limit prevents fetch
- **Data**:
  - `language`: Language code
  - `page`: Page number
  - `timestamp`: ISO timestamp

#### fetch_rate_limited_api
- **When**: When JioSaavn API returns 429
- **Data**:
  - `language`: Language code
  - `page`: Page number
  - `timestamp`: ISO timestamp

#### fetch_error
- **When**: When fetch fails with error
- **Data**:
  - `language`: Language code
  - `page`: Page number
  - `error`: Error message
  - `status`: HTTP status code
  - `timestamp`: ISO timestamp

#### fetch_skipped_locked
- **When**: When fetch is skipped due to Redis lock
- **Data**:
  - `language`: Language code
  - `page`: Page number
  - `timestamp`: ISO timestamp

### Processing Events

#### process_songs_error
- **When**: When song processing fails
- **Data**:
  - `error`: Error message
  - `timestamp`: ISO timestamp

#### song_processing_error
- **When**: When individual song processing fails
- **Data**:
  - `songId`: Song external ID
  - `error`: Error message
  - `timestamp`: ISO timestamp

### Release Events

#### new_song_detected
- **When**: When a new song is detected
- **Data**:
  - `songId`: Song database ID
  - `title`: Song title
  - `album`: Album name
  - `timestamp`: ISO timestamp

#### new_album_featured
- **When**: When an album is marked as featured
- **Data**:
  - `songId`: Song database ID
  - `album`: Album name
  - `timestamp`: ISO timestamp

#### new_songs_published
- **When**: When new releases are published to Redis
- **Data**:
  - `count`: Number of new releases
  - `timestamp`: ISO timestamp

### Client Events

#### client_new_release_received
- **When**: When client receives new release via SSE
- **Data**:
  - `songId`: Song external ID
  - `title`: Song title
  - `album`: Album name
  - `timestamp`: ISO timestamp

#### ui_update_shown
- **When**: When new release is shown in UI
- **Data**:
  - `songId`: Song external ID
  - `title`: Song title
  - `album`: Album name
  - `timestamp`: ISO timestamp

## Log Format

All events are logged in JSON format for easy parsing:

```json
{
  "timestamp": "2025-11-09T10:30:00Z",
  "event": "fetch_success",
  "language": "ml",
  "page": 1,
  "count": 50
}
```

## Monitoring Dashboard

### Key Metrics

1. **Fetch Success Rate**: Percentage of successful fetches
2. **API Response Time**: Average JioSaavn API response time
3. **New Releases per Day**: Number of new releases detected daily
4. **Client Connections**: Number of active SSE connections
5. **Rate Limit Events**: Frequency of rate limiting

### Alerting Thresholds

- **Fetch Failure Rate** > 5% in 10 minutes
- **API Response Time** > 5 seconds
- **Database Errors** > 10 in 1 minute
- **Redis Errors** > 10 in 1 minute
- **No New Releases** > 24 hours

## Data Retention

### Short-term (7 days)
- All events stored in database
- Available for real-time dashboards

### Long-term (90 days)
- Aggregated metrics
- Trend analysis
- Performance reports

## Privacy

### Data Collected
- System performance metrics
- Operational health data
- No personal user information

### Compliance
- GDPR compliant
- Data anonymization
- Secure storage

## Integration

### ELK Stack
- Elasticsearch for storage
- Logstash for processing
- Kibana for visualization

### Prometheus/Grafana
- Metrics collection
- Alerting
- Dashboard creation

## Custom Events

### Adding New Events
1. Use `logEvent()` function in fetcher
2. Include relevant data fields
3. Maintain consistent naming
4. Update documentation

### Example
```javascript
logEvent('custom_event_name', {
  custom_field: 'value',
  another_field: 123
});
```

## Troubleshooting

### Common Issues

1. **Missing Events**: Check log levels
2. **Duplicate Events**: Verify event deduplication
3. **Performance Impact**: Optimize logging frequency
4. **Storage Issues**: Implement log rotation

### Debug Mode
Enable detailed logging:
```bash
DEBUG=analytics:* npm start
```