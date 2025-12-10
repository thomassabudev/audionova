# 🚀 Trending Songs - Quick Start Guide

## 5-Minute Setup

### Step 1: Verify Files Exist

```bash
# Check frontend files
ls src/utils/trending.ts
ls src/services/trendingService.ts
ls src/components/TrendingSongsSection.tsx

# Check backend file
ls backend/routes/trending.js
```

### Step 2: Start Backend

```bash
cd backend
npm install
npm start
```

Backend should start on `http://localhost:5009`

### Step 3: Add to HomeView

Edit `src/views/HomeView.tsx`:

```tsx
import TrendingSongsSection from '@/components/TrendingSongsSection';

// Inside your component, add:
<div className="mt-8">
  <TrendingSongsSection limit={50} />
</div>
```

### Step 4: Start Frontend

```bash
npm run dev
```

### Step 5: Test

1. Open `http://localhost:5173`
2. Scroll to "Trending Now" section
3. Verify songs appear with:
   - Rank numbers (1, 2, 3...)
   - Delta indicators (▲/▼/—)
   - Badges (HOT/RISING/NEW)
   - Language badges (ML/TA/HI/EN)

---

## Quick Test

### Test API Endpoint

```bash
curl http://localhost:5009/api/trending?limit=10
```

Should return JSON with trending songs.

### Test Manual Refresh

```bash
curl -X POST http://localhost:5009/api/trending/refresh
```

Should trigger a refresh.

---

## Common Issues

### Issue: "Cannot find module"

**Solution:**
```bash
npm install
```

### Issue: Backend not starting

**Solution:**
Check if port 5009 is available:
```bash
# Windows
netstat -ano | findstr :5009

# Kill process if needed
taskkill /PID <PID> /F
```

### Issue: No songs appear

**Solution:**
1. Check browser console for errors
2. Verify backend is running
3. Check network tab for API calls
4. Try manual refresh button

---

## Configuration

### Change Refresh Interval

```tsx
<TrendingSongsSection 
  refreshInterval={30000}  // 30 seconds instead of 60
/>
```

### Change Number of Songs

```tsx
<TrendingSongsSection 
  limit={100}  // Show top 100 instead of 50
/>
```

### Disable Auto-Refresh

```tsx
<TrendingSongsSection 
  autoRefresh={false}  // Manual refresh only
/>
```

---

## Next Steps

1. Read `TRENDING_FEATURE_README.md` for full documentation
2. Run tests: `npm test src/utils/trending.test.ts`
3. Customize configuration in `src/utils/trending.ts`
4. Add monitoring/logging as needed

---

## Support

- **Documentation**: `TRENDING_FEATURE_README.md`
- **Implementation**: `TRENDING_IMPLEMENTATION_COMPLETE.md`
- **Tests**: `src/utils/trending.test.ts`

---

**Ready in 5 minutes!** 🎉
