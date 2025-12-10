# Cover Verification System - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  SongCard    │  │  HomeView    │  │  Trending    │             │
│  │  Component   │  │  Component   │  │  Component   │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         │                 │                  │                      │
│         └─────────────────┴──────────────────┘                      │
│                           │                                         │
│                           │ GET /api/cover-verification/:songId    │
│                           │ POST /api/cover-verification/report    │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Backend API (Express)                            │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Cover Verification Routes                        │ │
│  │  /verify  /batch  /:songId  /admin/*  /report  /stats       │ │
│  └───────────────────────┬───────────────────────────────────────┘ │
│                          │                                          │
│                          ▼                                          │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │         Cover Verification Service                            │ │
│  │  • fetchCoverForSong()                                        │ │
│  │  • verifyFromJioSaavn()                                       │ │
│  │  • verifyFromItunes()                                         │ │
│  │  • verifyFromMusicBrainz()                                    │ │
│  └───────────────────────┬───────────────────────────────────────┘ │
│                          │                                          │
│         ┌────────────────┼────────────────┐                        │
│         │                │                │                        │
│         ▼                ▼                ▼                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                    │
│  │  String  │    │  Image   │    │  Rate    │                    │
│  │  Utils   │    │Validator │    │ Limiter  │                    │
│  └──────────┘    └──────────┘    └──────────┘                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    External APIs                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │  JioSaavn    │  │   iTunes     │  │ MusicBrainz  │            │
│  │   (Primary)  │  │  (Fallback)  │  │  (Fallback)  │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  song_cover_map                                              │  │
│  │  • song_id (PK)                                              │  │
│  │  • cover_url                                                 │  │
│  │  • source                                                    │  │
│  │  • verified_at                                               │  │
│  │  • manual_override                                           │  │
│  │  • similarity_scores (JSONB)                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  cover_verification_logs                                     │  │
│  │  • id (PK)                                                   │  │
│  │  • song_id                                                   │  │
│  │  • query_title, query_artist                                 │  │
│  │  • chosen_source                                             │  │
│  │  • similarity_scores (JSONB)                                 │  │
│  │  • success, verification_time_ms                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  wrong_cover_reports                                         │  │
│  │  • id (PK)                                                   │  │
│  │  • song_id                                                   │  │
│  │  • displayed_cover_url                                       │  │
│  │  • status (pending/reviewed/fixed)                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Verification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Verification Request                             │
│  { title: "Peelings", artist: "Navod", language: "Malayalam" }     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  Check Cache   │
                   │  (30-day TTL)  │
                   └────────┬───────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
         ┌──────────┐           ┌──────────┐
         │  Found   │           │Not Found │
         │ (Cached) │           │          │
         └────┬─────┘           └────┬─────┘
              │                      │
              │                      ▼
              │         ┌────────────────────────┐
              │         │  JioSaavn Verification │
              │         │  1. Search (limit 8)   │
              │         │  2. Fetch detail by ID │
              │         │  3. Verify metadata    │
              │         │  4. Validate image     │
              │         └────────┬───────────────┘
              │                  │
              │         ┌────────┴────────┐
              │         │                 │
              │         ▼                 ▼
              │    ┌─────────┐      ┌─────────┐
              │    │ Match   │      │No Match │
              │    │ Found   │      │         │
              │    └────┬────┘      └────┬────┘
              │         │                │
              │         │                ▼
              │         │    ┌───────────────────┐
              │         │    │ iTunes Fallback   │
              │         │    │ 1. Search API     │
              │         │    │ 2. Verify metadata│
              │         │    │ 3. Validate image │
              │         │    └────────┬──────────┘
              │         │             │
              │         │    ┌────────┴────────┐
              │         │    │                 │
              │         │    ▼                 ▼
              │         │ ┌─────────┐    ┌─────────┐
              │         │ │ Match   │    │No Match │
              │         │ │ Found   │    │         │
              │         │ └────┬────┘    └────┬────┘
              │         │      │              │
              │         │      │              ▼
              │         │      │  ┌────────────────────┐
              │         │      │  │ MusicBrainz        │
              │         │      │  │ Fallback           │
              │         │      │  │ 1. Search          │
              │         │      │  │ 2. Cover Art       │
              │         │      │  │    Archive         │
              │         │      │  └────────┬───────────┘
              │         │      │           │
              │         │      │  ┌────────┴────────┐
              │         │      │  │                 │
              │         │      │  ▼                 ▼
              │         │      │┌─────────┐  ┌─────────┐
              │         │      ││ Match   │  │No Match │
              │         │      ││ Found   │  │ (null)  │
              │         │      │└────┬────┘  └────┬────┘
              │         │      │     │            │
              │         └──────┴─────┴────────────┘
              │                      │
              │                      ▼
              │         ┌────────────────────────┐
              │         │  Store in Database     │
              │         │  (song_cover_map)      │
              │         └────────┬───────────────┘
              │                  │
              │                  ▼
              │         ┌────────────────────────┐
              │         │  Log Verification      │
              │         │  (verification_logs)   │
              │         └────────┬───────────────┘
              │                  │
              └──────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Return Result  │
              │ to Frontend    │
              └────────────────┘
```

## Metadata Verification Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Candidate Song Detail                            │
│  { title: "Peelings (From Aavesham)", artist: "Navod",             │
│    language: "Malayalam", image: "https://..." }                    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  Normalize     │
                   │  • Remove ()[] │
                   │  • Remove      │
                   │    diacritics  │
                   │  • Lowercase   │
                   │  • Remove      │
                   │    punctuation │
                   └────────┬───────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Calculate Similarity   │
              │  (Damerau-Levenshtein)  │
              └────────┬────────────────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Title   │  │ Artist  │  │Language │
    │ Score   │  │ Score   │  │ Match   │
    │ ≥0.72?  │  │ ≥0.65?  │  │ Exact?  │
    └────┬────┘  └────┬────┘  └────┬────┘
         │            │            │
         └────────────┴────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
    ┌─────────┐              ┌─────────┐
    │  All    │              │  Any    │
    │  Pass   │              │  Fail   │
    └────┬────┘              └────┬────┘
         │                        │
         ▼                        ▼
    ┌─────────┐              ┌─────────┐
    │ Validate│              │ Reject  │
    │  Image  │              │Candidate│
    └────┬────┘              └─────────┘
         │
         ▼
    ┌─────────┐
    │ Accept  │
    │Candidate│
    └─────────┘
```

## Image Validation Process

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Image URL                                        │
│  https://images.saavncdn.com/song/500x500.jpg                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
                   ┌────────────────┐
                   │  HTTP HEAD     │
                   │  Request       │
                   └────────┬───────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
         ┌──────────┐           ┌──────────┐
         │ Success  │           │  Failed  │
         │ (200-299)│           │          │
         └────┬─────┘           └────┬─────┘
              │                      │
              ▼                      ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ Check Content-   │   │  HTTP GET        │
    │ Type             │   │  (Range: 0-1023) │
    └────────┬─────────┘   └────────┬─────────┘
             │                      │
             │         ┌────────────┴────────┐
             │         │                     │
             │         ▼                     ▼
             │    ┌─────────┐         ┌─────────┐
             │    │ Success │         │ Failed  │
             │    │(200/206)│         │         │
             │    └────┬────┘         └────┬────┘
             │         │                   │
             │         ▼                   │
             │  ┌──────────────┐          │
             │  │Check Content-│          │
             │  │Type          │          │
             │  └──────┬───────┘          │
             │         │                  │
             └─────────┴──────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    ┌──────────┐              ┌──────────┐
    │ Starts   │              │ Other    │
    │ with     │              │ Type     │
    │ "image/" │              │          │
    └────┬─────┘              └────┬─────┘
         │                         │
         ▼                         ▼
    ┌─────────┐              ┌─────────┐
    │ Valid   │              │ Invalid │
    │ Accept  │              │ Reject  │
    └─────────┘              └─────────┘
```

## Worker Queue Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    API Server                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  POST /api/cover-verification/verify                         │  │
│  │  • Check cache                                               │  │
│  │  • If miss: Queue job                                        │  │
│  │  • Return placeholder immediately                            │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Verification Queue                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  In-Memory Queue (or Redis in production)                   │  │
│  │  • Job: { song_id, title, artist, language, callback_url }  │  │
│  │  • FIFO processing                                           │  │
│  │  • Configurable concurrency (default: 3)                     │  │
│  └────────────────────────┬─────────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ Worker 1 │      │ Worker 2 │      │ Worker 3 │
    │          │      │          │      │          │
    │ Process  │      │ Process  │      │ Process  │
    │ Job      │      │ Job      │      │ Job      │
    └────┬─────┘      └────┬─────┘      └────┬─────┘
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Verification Service  │
              │  (Full flow)           │
              └────────┬───────────────┘
                       │
                       ▼
              ┌────────────────────────┐
              │  Store in Database     │
              └────────┬───────────────┘
                       │
                       ▼
              ┌────────────────────────┐
              │  Webhook Callback      │
              │  (Optional)            │
              └────────────────────────┘
```

## Data Flow

```
Frontend Request
       │
       ▼
┌──────────────┐
│ API Endpoint │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│ Check Cache  │────▶│ Return       │
│ (Database)   │     │ Cached       │
└──────┬───────┘     └──────────────┘
       │
       │ Cache Miss
       ▼
┌──────────────┐
│ Verification │
│ Service      │
└──────┬───────┘
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌──────────────┐              ┌──────────────┐
│ JioSaavn API │              │ String Utils │
│ • Search     │              │ • Normalize  │
│ • Detail     │              │ • Similarity │
└──────┬───────┘              └──────────────┘
       │
       ▼
┌──────────────┐              ┌──────────────┐
│ iTunes API   │              │ Image        │
│ (Fallback)   │              │ Validator    │
└──────┬───────┘              └──────────────┘
       │
       ▼
┌──────────────┐
│ MusicBrainz  │
│ (Fallback)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Store Result │
│ in Database  │
└──────┬───────┘
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌──────────────┐              ┌──────────────┐
│song_cover_map│              │verification_ │
│              │              │logs          │
└──────────────┘              └──────────────┘
       │
       ▼
┌──────────────┐
│ Return to    │
│ Frontend     │
└──────────────┘
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                    stringUtils.js                                   │
│  • normalize(str)                                                   │
│  • similarity(a, b)                                                 │
│  • isMatch(detail, query, thresholds)                               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Used by
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    coverVerificationService.js                      │
│  • fetchCoverForSong(queryMeta)                                     │
│  • verifyFromJioSaavn(queryMeta)                                    │
│  • verifyFromItunes(queryMeta)                                      │
│  • verifyFromMusicBrainz(queryMeta)                                 │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Used by
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    cover-verification.js (Routes)                   │
│  • POST /verify                                                     │
│  • POST /batch                                                      │
│  • GET /:songId                                                     │
│  • POST /admin/override                                             │
│  • DELETE /admin/override/:songId                                   │
│  • POST /report                                                     │
│  • GET /admin/reports                                               │
│  • GET /stats                                                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            │ Registered in
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    server.js                                        │
│  app.use('/api/cover-verification', coverVerificationRouter)       │
└─────────────────────────────────────────────────────────────────────┘
```

---

This architecture ensures:
- ✅ High reliability (multiple fallback sources)
- ✅ Good performance (caching, async processing)
- ✅ Maintainability (modular design)
- ✅ Scalability (worker queue, database indexes)
- ✅ Observability (comprehensive logging)
