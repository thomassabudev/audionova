/**
 * Test cover verification with known problematic songs
 * Run: node scripts/test-bad-cases.js
 */

require('dotenv').config();
const { fetchCoverForSong } = require('../services/coverVerificationService');

const badCases = [
  {
    id: 'test_case_1',
    title: 'Peelings',
    artist: 'Navod',
    language: 'Malayalam',
    notes: 'Should reject generic compilation covers and find exact match',
  },
  {
    id: 'test_case_2',
    title: 'Illuminati',
    artist: 'Sushin Shyam',
    language: 'Malayalam',
    notes: 'Should match exact song from Aavesham, not album compilation',
  },
  {
    id: 'test_case_3',
    title: 'Naatu Naatu',
    artist: 'Rahul Sipligunj',
    language: 'Telugu',
    notes: 'Should not match Hindi dubbed version',
  },
  {
    id: 'test_case_4',
    title: 'Aaromale',
    artist: 'Vijay Prakash',
    language: 'Kannada',
    notes: 'Popular song with many covers, should find original',
  },
  {
    id: 'test_case_5',
    title: 'Kesariya',
    artist: 'Arijit Singh',
    language: 'Hindi',
    notes: 'Should match Brahmastra version, not remixes',
  },
];

async function testBadCases() {
  console.log('='.repeat(80));
  console.log('Cover Verification - Bad Cases Test Suite');
  console.log('='.repeat(80));
  console.log();
  
  const results = [];
  
  for (const testCase of badCases) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Test Case ${testCase.id}: ${testCase.title} - ${testCase.artist}`);
    console.log(`Notes: ${testCase.notes}`);
    console.log('─'.repeat(80));
    
    try {
      const startTime = Date.now();
      
      const result = await fetchCoverForSong({
        title: testCase.title,
        artist: testCase.artist,
        language: testCase.language,
      });
      
      const duration = Date.now() - startTime;
      
      console.log('\n✓ Verification completed');
      console.log(`  Duration: ${duration}ms`);
      console.log(`  Source: ${result.source}`);
      console.log(`  Verified: ${result.verified}`);
      
      if (result.verified) {
        console.log(`  Song ID: ${result.song_id}`);
        console.log(`  Cover URL: ${result.cover_url}`);
        console.log(`  Similarity Scores:`, result.similarity_scores);
      } else {
        console.log(`  Error: ${result.error}`);
      }
      
      results.push({
        test_case: testCase.id,
        title: testCase.title,
        artist: testCase.artist,
        success: result.verified,
        source: result.source,
        duration_ms: duration,
        similarity_scores: result.similarity_scores,
      });
    } catch (error) {
      console.error('\n✗ Test failed:', error.message);
      
      results.push({
        test_case: testCase.id,
        title: testCase.title,
        artist: testCase.artist,
        success: false,
        error: error.message,
      });
    }
    
    // Rate limiting between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('Test Summary');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results
    .filter(r => r.duration_ms)
    .reduce((sum, r) => sum + r.duration_ms, 0) / results.length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Successful: ${successful} (${((successful / results.length) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failed} (${((failed / results.length) * 100).toFixed(1)}%)`);
  console.log(`Average Duration: ${avgDuration.toFixed(0)}ms`);
  
  // Source breakdown
  const sourceBreakdown = results.reduce((acc, r) => {
    if (r.source) {
      acc[r.source] = (acc[r.source] || 0) + 1;
    }
    return acc;
  }, {});
  
  console.log('\nSource Breakdown:');
  Object.entries(sourceBreakdown).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });
  
  // Detailed results
  console.log('\n\nDetailed Results:');
  console.log('─'.repeat(80));
  results.forEach(r => {
    const status = r.success ? '✓' : '✗';
    console.log(`${status} ${r.test_case}: ${r.title} - ${r.artist}`);
    console.log(`  Source: ${r.source || 'N/A'}, Duration: ${r.duration_ms || 'N/A'}ms`);
    if (r.similarity_scores) {
      console.log(`  Scores: title=${r.similarity_scores.title?.toFixed(2)}, artist=${r.similarity_scores.artist?.toFixed(2)}`);
    }
    if (r.error) {
      console.log(`  Error: ${r.error}`);
    }
    console.log();
  });
  
  console.log('='.repeat(80));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
testBadCases().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
