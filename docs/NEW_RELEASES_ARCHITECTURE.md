# New Releases Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              HomeView Component                          │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │         New Releases Section                   │     │  │
│  │  │                                                │     │  │
│  │  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐      │     │  │
│  │  │  │ NEW  │  │ NEW  │  │ NEW  │  │ NEW  │      │     │  │
│  │  │  │ Song │  │ Song │  │ Song │  │ Song │      │     │  │
│  │  │  │  ML  │  │  TA  │  │  HI  │  │  EN  │      │     │  │
│  │  │  └──────┘  └──────┘  └──────┘  └──────┘      │     │  │
│  │  │                                                │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ fetchNewReleasesData()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND SERVICES                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              JioSaavn API Service                        │  │
│  │                                                          │  │
│  │  ┌────────────────┐  ┌────────────────┐                │  │
│  │  │ getTrending    │  │ getTamil       │                │  │
│  │  │ Songs()        │  │ TrendingSongs()│                │  │
│  │  │ (Malayalam)    │  │                │                │  │
│  │  └────────────────┘  └────────────────┘                │  │
│  │                                                          │  │
│  │  ┌────────────────┐  ┌────────────────┐                │  │
│  │  │ getHindi       │  │ getEnglish     │                │  │
│  │  │ TrendingSongs()│  │ NewReleases()  │  ← NEW!        │  │
│  │  │                │  │                │                │  │
│  │  └────────────────┘  └────────────────┘                │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Parallel API Calls
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA PROCESSING                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 1: Combine Results                                │  │
│  │  [ML songs] + [TA songs] + [HI songs] + [EN songs]      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 2: Remove Duplicates                              │  │
│  │  uniqById() - Filter by song.id                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 3: Filter New Songs                               │  │
│  │  ┌────────────────────────────────────────────────┐     │  │
│  │  │         isNewSong() Helper                     │     │  │
│  │  │                                                │     │  │
│  │  │  • Check releaseDate in 2025?                 │     │  │
│  │  │  • Check releaseDate within 14 days?          │     │  │
│  │  │  • Fallback to year === 2025?                 │     │  │
│  │  │                                                │     │  │
│  │  │  Return: true/false                            │     │  │
│  │  └────────────────────────────────────────────────┘     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 4: Sort by Release Date                           │  │
│  │  Newest → Oldest                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Step 5: Limit Results                                  │  │
│  │  Take first 50 songs                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Filtered Songs
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         RENDERING                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  For each song:                                          │  │
│  │                                                          │  │
│  │  1. Render song card                                    │  │
│  │  2. Check isNewSong(song)                               │  │
│  │  3. If true → Show NEW badge                            │  │
│  │  4. Add language badge                                  │  │
│  │  5. Add play/like buttons                               │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
┌─────────────┐
│   User      │
│   Opens     │
│   HomeView  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  fetchNewReleasesData()                                 │
│                                                         │
│  Promise.all([                                          │
│    jiosaavnApi.getTrendingSongs(),        // Malayalam │
│    jiosaavnApi.getTamilTrendingSongs(),   // Tamil     │
│    jiosaavnApi.getHindiTrendingSongs(),   // Hindi     │
│    jiosaavnApi.getEnglishNewReleases()    // English   │
│  ])                                                     │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Combine Results                                        │
│  const combined = [...mal, ...ta, ...hi, ...en]        │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Remove Duplicates                                      │
│  const unique = uniqById(combined)                      │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Filter New Songs                                       │
│  const filtered = unique.filter(song =>                 │
│    isNewSong(song)                                      │
│  )                                                      │
│                                                         │
│  isNewSong() checks:                                    │
│  • releaseDate in 2025? → true                         │
│  • releaseDate within 14 days? → true                  │
│  • year === 2025? → true                               │
│  • Otherwise → false                                    │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Sort by Release Date                                   │
│  const sorted = filtered.sort((a, b) =>                │
│    new Date(b.releaseDate) - new Date(a.releaseDate)   │
│  )                                                      │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Update State                                           │
│  setNewReleases(sorted.slice(0, 50))                   │
└──────┬──────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  Render UI                                              │
│                                                         │
│  {newReleases.map(song => (                            │
│    <SongCard key={song.id}>                            │
│      <img src={song.image} />                          │
│                                                         │
│      {isNewSong(song) && (                             │
│        <div className="new-badge">NEW</div>            │
│      )}                                                 │
│                                                         │
│      <LanguageBadge language={song.language} />        │
│    </SongCard>                                         │
│  ))}                                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
HomeView
├── Hero Section
├── Search Bar
└── New Releases Section
    ├── Section Header
    │   ├── Title: "New Releases"
    │   ├── Refresh Button
    │   └── See All Button
    │
    └── Song Grid
        ├── SongCard (Malayalam)
        │   ├── Image
        │   ├── NEW Badge ← isNewSong() = true
        │   ├── Language Badge (ML)
        │   ├── Play Button
        │   ├── Like Button
        │   └── Song Info
        │
        ├── SongCard (Tamil)
        │   ├── Image
        │   ├── NEW Badge ← isNewSong() = true
        │   ├── Language Badge (TA)
        │   ├── Play Button
        │   ├── Like Button
        │   └── Song Info
        │
        ├── SongCard (Hindi)
        │   ├── Image
        │   ├── NEW Badge ← isNewSong() = true
        │   ├── Language Badge (HI)
        │   ├── Play Button
        │   ├── Like Button
        │   └── Song Info
        │
        └── SongCard (English) ← NEW!
            ├── Image
            ├── NEW Badge ← isNewSong() = true
            ├── Language Badge (EN)
            ├── Play Button
            ├── Like Button
            └── Song Info
```

---

## isNewSong() Decision Tree

```
                    isNewSong(song)
                          │
                          ▼
                   song exists?
                    /         \
                  NO           YES
                  │             │
                  ▼             ▼
              return false   Has releaseDate?
                              /         \
                            YES          NO
                             │            │
                             ▼            ▼
                    Parse releaseDate   Has year?
                             │            /    \
                             ▼          YES     NO
                       Valid date?       │      │
                        /      \         ▼      ▼
                      YES      NO    year===2025? return false
                       │        │      /    \
                       ▼        ▼    YES    NO
                  Calculate    Skip  │      │
                  days diff     to   ▼      ▼
                       │       year  return return
                       ▼       check true   false
                  Within 14 days?
                    /         \
                  YES          NO
                   │            │
                   ▼            ▼
              return true   Year is 2025?
                              /         \
                            YES          NO
                             │            │
                             ▼            ▼
                        return true  return false
```

---

## Backend API Flow

```
Client Request
     │
     ▼
GET /api/new-releases
     │
     ▼
┌─────────────────────────────────────────┐
│  fetchRealNewReleases()                 │
│                                         │
│  Promise.all([                          │
│    axios.get('malayalam songs 2025'),  │
│    axios.get('tamil songs 2025'),      │
│    axios.get('bollywood songs 2025'),  │
│    axios.get('english songs 2025')     │ ← NEW!
│  ])                                     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Process Each Language                  │
│  • Map to internal format               │
│  • Set language code (ml/ta/hi/en)     │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Combine All Songs                      │
│  allSongs = [...ml, ...ta, ...hi, ...en]│
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Remove Duplicates                      │
│  Filter by external_id                  │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Filter by 2025 or Recent               │
│  • Check release_date year === 2025     │
│  • OR within last 14 days               │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Ensure Language Mix                    │
│  • Take up to 15 ML songs               │
│  • Take up to 15 TA songs               │
│  • Take up to 15 HI songs               │
│  • Take up to 15 EN songs               │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Shuffle & Limit                        │
│  • Shuffle for variety                  │
│  • Return top 50 songs                  │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Return JSON Response                   │
│  {                                      │
│    success: true,                       │
│    data: [...songs],                    │
│    count: 50                            │
│  }                                      │
└─────────────────────────────────────────┘
```

---

## File Dependencies

```
HomeView.tsx
    │
    ├── imports isNewSong from utils/isNewSong.ts
    ├── imports jiosaavnApi from services/jiosaavnApi.ts
    ├── imports musicService from services/musicService.ts
    └── imports LanguageBadge from components/LanguageBadge.tsx

SongCard.tsx
    │
    ├── imports isNewSong from utils/isNewSong.ts
    └── imports Song type from services/jiosaavnApi.ts

jiosaavnApi.ts
    │
    ├── getTrendingSongs() → Malayalam
    ├── getTamilTrendingSongs() → Tamil
    ├── getHindiTrendingSongs() → Hindi
    └── getEnglishNewReleases() → English (NEW!)

musicService.ts
    │
    ├── imports jiosaavnApi
    └── getNewReleases() → Combines all languages

backend/routes/new-releases.js
    │
    ├── fetchRealNewReleases() → Fetches from JioSaavn API
    └── Filters by 2025 or recent dates
```

---

## State Management

```
HomeView Component State:

┌─────────────────────────────────────────┐
│  Data States                            │
├─────────────────────────────────────────┤
│  • newReleases: Song[]                  │
│  • trendingSongs: Song[]                │
│  • malayalamSongs: Song[]               │
│  • tamilSongs: Song[]                   │
│  • romanceSongs: Song[]                 │
│  • mixedRomanceSongs: Song[]            │
│  • recentlyPlayed: Song[]               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Loading States                         │
├─────────────────────────────────────────┤
│  • isNewReleasesLoading: boolean        │
│  • isTrendingLoading: boolean           │
│  • isRefreshingNewReleases: boolean     │
│  • isRefreshingTrending: boolean        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  UI States                              │
├─────────────────────────────────────────┤
│  • showAllNewReleases: boolean          │
│  • showAllTrending: boolean             │
│  • searchQuery: string                  │
│  • error: string | null                 │
└─────────────────────────────────────────┘
```

---

## Performance Metrics

```
┌─────────────────────────────────────────┐
│  API Call Performance                   │
├─────────────────────────────────────────┤
│  • Parallel fetching: 4 APIs at once    │
│  • Average response time: ~500ms        │
│  • Total fetch time: ~500ms (parallel)  │
│  • Cache duration: 60 seconds           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Data Processing Performance            │
├─────────────────────────────────────────┤
│  • Combine: O(n)                        │
│  • Deduplicate: O(n)                    │
│  • Filter: O(n)                         │
│  • Sort: O(n log n)                     │
│  • Total: O(n log n)                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Rendering Performance                  │
├─────────────────────────────────────────┤
│  • Initial render: ~50 songs            │
│  • Lazy loading: Supported              │
│  • Virtual scrolling: Not implemented   │
│  • Animation: Framer Motion             │
└─────────────────────────────────────────┘
```

---

## Error Handling

```
Try-Catch Hierarchy:

fetchNewReleasesData()
    │
    ├── Try: Fetch from all APIs
    │   ├── Success → Process data
    │   └── Error → Log & set empty array
    │
    ├── Try: Filter with isNewSong()
    │   ├── Success → Update state
    │   └── Error → Log & use unfiltered
    │
    └── Finally: Set loading to false

isNewSong()
    │
    ├── Check: song exists?
    │   ├── No → return false
    │   └── Yes → continue
    │
    ├── Try: Parse releaseDate
    │   ├── Valid → check conditions
    │   └── Invalid → fallback to year
    │
    └── Fallback: Check year field
        ├── Valid → check === 2025
        └── Invalid → return false
```

---

**Last Updated**: 2025-01-15  
**Version**: 1.0.0
