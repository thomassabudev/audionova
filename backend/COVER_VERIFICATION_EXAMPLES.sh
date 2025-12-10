#!/bin/bash
# Cover Verification API Examples
# Make executable: chmod +x COVER_VERIFICATION_EXAMPLES.sh

BASE_URL="http://localhost:3000/api/cover-verification"
ADMIN_TOKEN="your-secure-admin-token-here"

echo "========================================="
echo "Cover Verification API Examples"
echo "========================================="
echo ""

# Example 1: Verify single song
echo "1. Verify single song (Peelings - Navod)"
echo "-----------------------------------------"
curl -X POST "$BASE_URL/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Peelings",
    "artist": "Navod",
    "language": "Malayalam",
    "song_id": "saavn_test_123"
  }' | jq '.'
echo ""
echo ""

# Example 2: Get cover mapping
echo "2. Get cover mapping for song"
echo "-----------------------------------------"
curl "$BASE_URL/saavn_test_123" | jq '.'
echo ""
echo ""

# Example 3: Batch verification
echo "3. Batch verify multiple songs"
echo "-----------------------------------------"
curl -X POST "$BASE_URL/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "songs": [
      {
        "title": "Peelings",
        "artist": "Navod",
        "language": "Malayalam",
        "song_id": "saavn_1"
      },
      {
        "title": "Illuminati",
        "artist": "Sushin Shyam",
        "language": "Malayalam",
        "song_id": "saavn_2"
      },
      {
        "title": "Naatu Naatu",
        "artist": "Rahul Sipligunj",
        "language": "Telugu",
        "song_id": "saavn_3"
      }
    ]
  }' | jq '.'
echo ""
echo ""

# Example 4: Admin override
echo "4. Admin override (set manual cover)"
echo "-----------------------------------------"
curl -X POST "$BASE_URL/admin/override" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: $ADMIN_TOKEN" \
  -d '{
    "song_id": "saavn_manual_123",
    "cover_url": "https://example.com/correct-cover.jpg",
    "reason": "User reported wrong cover, manually verified",
    "title": "Test Song",
    "artist": "Test Artist",
    "language": "Malayalam"
  }' | jq '.'
echo ""
echo ""

# Example 5: Remove admin override
echo "5. Remove admin override"
echo "-----------------------------------------"
curl -X DELETE "$BASE_URL/admin/override/saavn_manual_123" \
  -H "X-Admin-Token: $ADMIN_TOKEN" | jq '.'
echo ""
echo ""

# Example 6: Report wrong cover
echo "6. User report wrong cover"
echo "-----------------------------------------"
curl -X POST "$BASE_URL/report" \
  -H "Content-Type: application/json" \
  -d '{
    "song_id": "saavn_test_123",
    "displayed_cover_url": "https://example.com/wrong-cover.jpg",
    "correct_hint": "Should show Aavesham movie poster",
    "user_id": "user_789"
  }' | jq '.'
echo ""
echo ""

# Example 7: Get admin reports
echo "7. Get admin reports (pending)"
echo "-----------------------------------------"
curl "$BASE_URL/admin/reports?status=pending&limit=10" \
  -H "X-Admin-Token: $ADMIN_TOKEN" | jq '.'
echo ""
echo ""

# Example 8: Get statistics
echo "8. Get verification statistics"
echo "-----------------------------------------"
curl "$BASE_URL/stats" | jq '.'
echo ""
echo ""

echo "========================================="
echo "Examples complete!"
echo "========================================="
