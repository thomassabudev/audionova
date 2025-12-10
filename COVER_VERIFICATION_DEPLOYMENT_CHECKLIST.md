# Cover Verification System - Deployment Checklist

Use this checklist to deploy the cover verification system to production.

## ☐ Pre-Deployment (Development)

### Database Setup
- [ ] Run migration: `node backend/scripts/init-cover-verification-db.js`
- [ ] Verify tables created: `psql -d vibemusic -c "\dt"`
- [ ] Check indexes: `psql -d vibemusic -c "\di"`
- [ ] Test database connection from app

### Environment Configuration
- [ ] Generate secure admin token: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Add `ADMIN_TOKEN` to `backend/.env`
- [ ] Verify `DATABASE_URL` is set
- [ ] Verify `JIOSAAVN_API_BASE` is set
- [ ] Set `VERIFICATION_CONCURRENCY` (default: 3)

### Testing
- [ ] Run unit tests: `npm test -- stringUtils.test.js`
- [ ] Run unit tests: `npm test -- imageValidator.test.js`
- [ ] Run integration tests: `npm test -- coverVerification.integration.test.js`
- [ ] Run bad cases test: `node backend/scripts/test-bad-cases.js`
- [ ] Verify all tests pass (100% success rate)

### API Testing
- [ ] Start server: `npm start`
- [ ] Test verify endpoint: `curl -X POST http://localhost:3000/api/cover-verification/verify -H "Content-Type: application/json" -d '{"title":"Peelings","artist":"Navod","language":"Malayalam"}'`
- [ ] Test get endpoint: `curl http://localhost:3000/api/cover-verification/stats`
- [ ] Test admin override (with token)
- [ ] Test report endpoint
- [ ] Run example script: `./backend/COVER_VERIFICATION_EXAMPLES.sh`

### Code Review
- [ ] Review `backend/utils/stringUtils.js` - similarity thresholds
- [ ] Review `backend/services/coverVerificationService.js` - rate limits
- [ ] Review `backend/routes/cover-verification.js` - auth middleware
- [ ] Review database migration - indexes and constraints
- [ ] Check error handling in all endpoints

## ☐ Production Deployment

### Database
- [ ] Backup production database before migration
- [ ] Run migration on production: `NODE_ENV=production node backend/scripts/init-cover-verification-db.js`
- [ ] Verify tables created successfully
- [ ] Grant appropriate permissions to app user
- [ ] Test database connection from production app

### Environment Variables
- [ ] Set `DATABASE_URL` (production database)
- [ ] Set `ADMIN_TOKEN` (new secure token for production)
- [ ] Set `JIOSAAVN_API_BASE` (or use default)
- [ ] Set `VERIFICATION_CONCURRENCY` (3-5 for production)
- [ ] Set `NODE_ENV=production`

### Application Deployment
- [ ] Deploy updated backend code
- [ ] Verify routes registered: Check `/api/cover-verification/stats`
- [ ] Test health check: `curl https://your-domain.com/api/health`
- [ ] Test verification endpoint with real song
- [ ] Monitor logs for errors

### Worker Queue (Optional but Recommended)
- [ ] Deploy worker process separately
- [ ] Configure process manager (PM2/systemd)
- [ ] Set worker concurrency (3-5)
- [ ] Verify worker is processing jobs
- [ ] Set up worker monitoring

### Monitoring Setup
- [ ] Set up log aggregation (CloudWatch/Datadog/etc.)
- [ ] Create alerts for verification failures
- [ ] Create alerts for high verification times (>5s)
- [ ] Create dashboard for key metrics:
  - Success rate
  - Average verification time
  - Source distribution
  - Manual override rate
- [ ] Set up database query monitoring

### Performance Tuning
- [ ] Monitor verification times
- [ ] Adjust rate limits if needed
- [ ] Tune similarity thresholds based on logs
- [ ] Configure database connection pooling
- [ ] Set up Redis for caching (optional)

## ☐ Post-Deployment

### Verification (First Hour)
- [ ] Test 10 random songs from trending
- [ ] Verify covers are correct
- [ ] Check verification logs in database
- [ ] Monitor error rates
- [ ] Check API response times

### Monitoring (First Day)
- [ ] Review verification success rate (target: ≥95%)
- [ ] Review average verification time (target: <3s)
- [ ] Check cache hit rate (should increase over time)
- [ ] Review manual override requests
- [ ] Check user reports

### Optimization (First Week)
- [ ] Analyze verification logs for patterns
- [ ] Identify songs with low similarity scores
- [ ] Adjust thresholds if needed
- [ ] Review fallback source usage
- [ ] Optimize slow queries

### User Feedback (First Month)
- [ ] Review wrong cover reports
- [ ] Process admin overrides
- [ ] Analyze common failure patterns
- [ ] Update normalization rules if needed
- [ ] Document edge cases

## ☐ Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor verification success rate
- [ ] Review user reports (if any)

### Weekly
- [ ] Review verification statistics
- [ ] Check database size and growth
- [ ] Clean old logs (>90 days)
- [ ] Review manual overrides

### Monthly
- [ ] Analyze verification patterns
- [ ] Update similarity thresholds if needed
- [ ] Review and optimize slow queries
- [ ] Update documentation with learnings

## ☐ Rollback Plan

If issues occur:

### Immediate Rollback
```bash
# 1. Disable cover verification in frontend
# Comment out verification calls in SongCard component

# 2. Revert backend routes (if needed)
# Remove cover verification routes from server.js

# 3. Keep database tables (for future retry)
# Don't drop tables - just disable the feature
```

### Partial Rollback
```bash
# Keep system running but use cached results only
# Set cache TTL to infinite in queries:
# verified_at > NOW() - INTERVAL '999 years'
```

### Data Preservation
```bash
# Backup verification data before rollback
pg_dump -U user -d vibemusic -t song_cover_map > backup_cover_map.sql
pg_dump -U user -d vibemusic -t cover_verification_logs > backup_logs.sql
```

## ☐ Success Criteria

System is considered successfully deployed when:

- [ ] ✅ All tests passing (100%)
- [ ] ✅ Verification success rate ≥95%
- [ ] ✅ Average verification time <3s
- [ ] ✅ Cache hit rate ≥80% (after 24h)
- [ ] ✅ Manual override rate <5%
- [ ] ✅ No critical errors in logs
- [ ] ✅ User reports <1% of verifications
- [ ] ✅ API response time <500ms (cached)
- [ ] ✅ Database queries optimized (<100ms)
- [ ] ✅ Monitoring and alerts configured

## 📞 Emergency Contacts

- **Database Issues**: [DBA contact]
- **API Issues**: [Backend team]
- **Monitoring**: [DevOps team]
- **User Reports**: [Support team]

## 📚 Reference Documents

- Quick Start: `COVER_VERIFICATION_QUICKSTART.md`
- Full Guide: `backend/COVER_VERIFICATION_README.md`
- Implementation: `COVER_VERIFICATION_IMPLEMENTATION.md`
- Summary: `COVER_VERIFICATION_SUMMARY.md`

## 🎯 Key Metrics to Track

```sql
-- Success rate (target: ≥95%)
SELECT 
  COUNT(*) FILTER (WHERE success = true)::float / COUNT(*) * 100
FROM cover_verification_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Average time (target: <3000ms)
SELECT AVG(verification_time_ms)
FROM cover_verification_logs
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Cache hit rate (target: ≥80%)
-- Track via application metrics

-- Manual override rate (target: <5%)
SELECT 
  COUNT(*) FILTER (WHERE manual_override = true)::float / COUNT(*) * 100
FROM song_cover_map;
```

---

**Deployment Status**: ☐ Not Started | ☐ In Progress | ☐ Complete

**Deployed By**: _______________

**Deployment Date**: _______________

**Production URL**: _______________

**Notes**: _______________________________________________
