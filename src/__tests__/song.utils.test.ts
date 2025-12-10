import { getLangCode, getBestImage, normalizeSongImage, isNewSong, balanceByLanguage, dedupeById } from '../utils/song';

// Test plan for song utilities
// These tests verify the functionality of song utility functions without using Jest syntax

console.log('=== Song Utilities Test Plan ===');

// Test getLangCode function
console.log('\n1. Testing getLangCode function:');

// Test Malayalam language codes
const mlTests = [
  { input: 'malayalam', expected: 'ML' },
  { input: 'Malayalam', expected: 'ML' },
  { input: 'ml', expected: 'ML' }
];

mlTests.forEach(test => {
  const result = getLangCode(test.input);
  console.log(`  getLangCode('${test.input}') = ${result} | Expected: ${test.expected} | ${result === test.expected ? 'PASS' : 'FAIL'}`);
});

// Test Tamil language codes
const taTests = [
  { input: 'tamil', expected: 'TA' },
  { input: 'Tamil', expected: 'TA' },
  { input: 'ta', expected: 'TA' }
];

taTests.forEach(test => {
  const result = getLangCode(test.input);
  console.log(`  getLangCode('${test.input}') = ${result} | Expected: ${test.expected} | ${result === test.expected ? 'PASS' : 'FAIL'}`);
});

// Test Hindi language codes
const hiTests = [
  { input: 'hindi', expected: 'HI' },
  { input: 'Hindi', expected: 'HI' },
  { input: 'hi', expected: 'HI' }
];

hiTests.forEach(test => {
  const result = getLangCode(test.input);
  console.log(`  getLangCode('${test.input}') = ${result} | Expected: ${test.expected} | ${result === test.expected ? 'PASS' : 'FAIL'}`);
});

// Test English language codes
const enTests = [
  { input: 'english', expected: 'EN' },
  { input: 'English', expected: 'EN' },
  { input: 'en', expected: 'EN' },
  { input: 'eng', expected: 'EN' }
];

enTests.forEach(test => {
  const result = getLangCode(test.input);
  console.log(`  getLangCode('${test.input}') = ${result} | Expected: ${test.expected} | ${result === test.expected ? 'PASS' : 'FAIL'}`);
});

// Test null/undefined inputs
console.log('  getLangCode(null) =', getLangCode(null), '| Expected: null |', getLangCode(null) === null ? 'PASS' : 'FAIL');
console.log('  getLangCode(undefined) =', getLangCode(undefined), '| Expected: null |', getLangCode(undefined) === null ? 'PASS' : 'FAIL');

// Test unknown languages
const unknownTests = [
  { input: 'kannada', expected: 'KN' },
  { input: 'telugu', expected: 'TE' }
];

unknownTests.forEach(test => {
  const result = getLangCode(test.input);
  console.log(`  getLangCode('${test.input}') = ${result} | Expected: ${test.expected} | ${result === test.expected ? 'PASS' : 'FAIL'}`);
});

// Test getBestImage function
console.log('\n2. Testing getBestImage function:');

// Test null/undefined inputs
console.log('  getBestImage(null) =', getBestImage(null), '| Expected: null |', getBestImage(null) === null ? 'PASS' : 'FAIL');
console.log('  getBestImage(undefined) =', getBestImage(undefined), '| Expected: null |', getBestImage(undefined) === null ? 'PASS' : 'FAIL');

// Test string image URL
const testUrl = 'https://example.com/image.jpg';
const stringResult = getBestImage(testUrl);
console.log(`  getBestImage('${testUrl}') = ${stringResult} | Expected: ${testUrl} | ${stringResult === testUrl ? 'PASS' : 'FAIL'}`);

// Test array of strings
const testUrls = [
  'https://example.com/short.jpg',
  'https://example.com/very-long-image-url-with-high-quality.jpg',
  'https://example.com/medium.jpg'
];
const arrayResult = getBestImage(testUrls);
const expectedArrayResult = testUrls[1]; // Longest URL
console.log(`  getBestImage(array) = ${arrayResult} | Expected: ${expectedArrayResult} | ${arrayResult === expectedArrayResult ? 'PASS' : 'FAIL'}`);

// Test object with priority keys
const imageObj = {
  thumbnail: 'https://example.com/thumb.jpg',
  medium: 'https://example.com/medium.jpg',
  large: 'https://example.com/large.jpg',
  original: 'https://example.com/original.jpg'
};
const objResult = getBestImage(imageObj);
const expectedObjResult = 'https://example.com/original.jpg';
console.log(`  getBestImage(object) = ${objResult} | Expected: ${expectedObjResult} | ${objResult === expectedObjResult ? 'PASS' : 'FAIL'}`);

// Test object with custom keys
const customImageObj = {
  custom1: 'https://example.com/custom1.jpg',
  custom2: 'https://example.com/custom2.jpg'
};
const customResult = getBestImage(customImageObj);
const expectedCustomResult = 'https://example.com/custom1.jpg';
console.log(`  getBestImage(custom object) = ${customResult} | Expected: ${expectedCustomResult} | ${customResult === expectedCustomResult ? 'PASS' : 'FAIL'}`);

// Test normalizeSongImage function
console.log('\n3. Testing normalizeSongImage function:');

// Test song with no image fields
const songNoImage = { id: '1', name: 'Test Song' };
const noImageResult = normalizeSongImage(songNoImage);
console.log(`  normalizeSongImage(no image) = ${noImageResult} | Expected: null | ${noImageResult === null ? 'PASS' : 'FAIL'}`);

// Test song with image field
const songWithImage = {
  id: '1',
  name: 'Test Song',
  image: 'https://example.com/image.jpg'
};
const withImageResult = normalizeSongImage(songWithImage);
const expectedWithImageResult = 'https://example.com/image.jpg';
console.log(`  normalizeSongImage(with image) = ${withImageResult} | Expected: ${expectedWithImageResult} | ${withImageResult === expectedWithImageResult ? 'PASS' : 'FAIL'}`);

// Test song with thumbnail field
const songWithThumbnail = {
  id: '1',
  name: 'Test Song',
  thumbnail: 'https://example.com/thumb.jpg'
};
const withThumbnailResult = normalizeSongImage(songWithThumbnail);
const expectedWithThumbnailResult = 'https://example.com/thumb.jpg';
console.log(`  normalizeSongImage(with thumbnail) = ${withThumbnailResult} | Expected: ${expectedWithThumbnailResult} | ${withThumbnailResult === expectedWithThumbnailResult ? 'PASS' : 'FAIL'}`);

// Test isNewSong function
console.log('\n4. Testing isNewSong function:');

// Test null song
const nullSongResult = isNewSong(null as any);
console.log(`  isNewSong(null) = ${nullSongResult} | Expected: false | ${nullSongResult === false ? 'PASS' : 'FAIL'}`);

// Test song from target year
const songTargetYear = {
  id: '1',
  name: 'Test Song',
  year: '2025'
};
const targetYearResult = isNewSong(songTargetYear, { targetYear: 2025 });
console.log(`  isNewSong(target year) = ${targetYearResult} | Expected: true | ${targetYearResult === true ? 'PASS' : 'FAIL'}`);

// Test recent song
const songRecent = {
  id: '1',
  name: 'Test Song',
  releaseDate: new Date().toISOString()
};
const recentResult = isNewSong(songRecent, { recentDays: 14 });
console.log(`  isNewSong(recent) = ${recentResult} | Expected: true | ${recentResult === true ? 'PASS' : 'FAIL'}`);

// Test old song
const songOld = {
  id: '1',
  name: 'Test Song',
  year: '2020'
};
const oldResult = isNewSong(songOld, { targetYear: 2025 });
console.log(`  isNewSong(old) = ${oldResult} | Expected: false | ${oldResult === false ? 'PASS' : 'FAIL'}`);

// Test balanceByLanguage function
console.log('\n5. Testing balanceByLanguage function:');

const createTestSong = (id: string, language: string) => ({
  id,
  name: `Song ${id}`,
  language
});

// Test Case A: 15 ML, 10 TA, 5 HI -> should distribute as [9,8,8]
console.log('  Case A: 15 ML, 10 TA, 5 HI songs');
const mlSongs = Array.from({ length: 15 }, (_, i) => createTestSong(`ml${i}`, 'malayalam'));
const taSongs = Array.from({ length: 10 }, (_, i) => createTestSong(`ta${i}`, 'tamil'));
const hiSongs = Array.from({ length: 5 }, (_, i) => createTestSong(`hi${i}`, 'hindi'));
const songsA = [...mlSongs, ...taSongs, ...hiSongs];

const resultA = balanceByLanguage(songsA, ['ML', 'TA', 'HI'], 25);

// Count by language
const mlCountA = resultA.filter(s => s.language?.toLowerCase().includes('malayalam')).length;
const taCountA = resultA.filter(s => s.language?.toLowerCase().includes('tamil')).length;
const hiCountA = resultA.filter(s => s.language?.toLowerCase().includes('hindi')).length;

console.log(`    ML count: ${mlCountA} | Expected: 9 | ${mlCountA === 9 ? 'PASS' : 'FAIL'} |`);
console.log(`    TA count: ${taCountA} | Expected: 8 | ${taCountA === 8 ? 'PASS' : 'FAIL'} |`);
console.log(`    HI count: ${hiCountA} | Expected: 8 | ${hiCountA === 8 ? 'PASS' : 'FAIL'} |`);
console.log(`    Total: ${resultA.length} | Expected: 25 | ${resultA.length === 25 ? 'PASS' : 'FAIL'} |`);

// Test Case B: ML has 5 songs, TA has 20, HI has 0
console.log('  Case B: 5 ML, 20 TA, 0 HI songs');
const mlSongsB = Array.from({ length: 5 }, (_, i) => createTestSong(`ml${i}`, 'malayalam'));
const taSongsB = Array.from({ length: 20 }, (_, i) => createTestSong(`ta${i}`, 'tamil'));
const songsB = [...mlSongsB, ...taSongsB];

const resultB = balanceByLanguage(songsB, ['ML', 'TA', 'HI'], 25);

// Count by language
const mlCountB = resultB.filter(s => s.language?.toLowerCase().includes('malayalam')).length;
const taCountB = resultB.filter(s => s.language?.toLowerCase().includes('tamil')).length;
const hiCountB = resultB.filter(s => s.language?.toLowerCase().includes('hindi')).length;

console.log(`    ML count: ${mlCountB} | Expected: 5 | ${mlCountB === 5 ? 'PASS' : 'FAIL'} |`);
console.log(`    TA count: ${taCountB} | Expected: 20 | ${taCountB === 20 ? 'PASS' : 'FAIL'} |`);
console.log(`    HI count: ${hiCountB} | Expected: 0 | ${hiCountB === 0 ? 'PASS' : 'FAIL'} |`);
console.log(`    Total: ${resultB.length} | Expected: 25 | ${resultB.length === 25 ? 'PASS' : 'FAIL'} |`);

// Test deduplication
console.log('  Testing deduplication by ID');
const song1 = { id: '1', name: 'Song 1', language: 'malayalam' };
const song2 = { id: '2', name: 'Song 2', language: 'tamil' };
const duplicate = { id: '1', name: 'Song 1 Duplicate', language: 'hindi' }; // Same ID

const songsWithDuplicates = [song1, song2, duplicate];
const resultDedupe = balanceByLanguage(songsWithDuplicates, ['ML', 'TA', 'HI'], 25);

console.log(`    Result length: ${resultDedupe.length} | Expected: 2 (deduplicated) | ${resultDedupe.length === 2 ? 'PASS' : 'FAIL'} |`);
const hasId1 = resultDedupe.find(s => s.id === '1');
const hasId2 = resultDedupe.find(s => s.id === '2');
console.log(`    Has ID '1': ${!!hasId1} | Expected: true | ${!!hasId1 ? 'PASS' : 'FAIL'} |`);
console.log(`    Has ID '2': ${!!hasId2} | Expected: true | ${!!hasId2 ? 'PASS' : 'FAIL'} |`);

// Test dedupeById function
console.log('\n6. Testing dedupeById function:');

// Test with duplicates
const songsWithDupes = [
  { id: '1', name: 'Song 1' },
  { id: '2', name: 'Song 2' },
  { id: '1', name: 'Song 1 Duplicate' }, // Duplicate
  { id: '3', name: 'Song 3' }
];

const dedupedResult = dedupeById(songsWithDupes);
console.log(`  dedupeById(with duplicates) length = ${dedupedResult.length} | Expected: 3 | ${dedupedResult.length === 3 ? 'PASS' : 'FAIL'} |`);

// Test empty array
const emptyResult = dedupeById([]);
console.log(`  dedupeById(empty) length = ${emptyResult.length} | Expected: 0 | ${emptyResult.length === 0 ? 'PASS' : 'FAIL'} |`);

// Test array with no duplicates
const songsNoDupes = [
  { id: '1', name: 'Song 1' },
  { id: '2', name: 'Song 2' },
  { id: '3', name: 'Song 3' }
];

const noDupesResult = dedupeById(songsNoDupes);
console.log(`  dedupeById(no duplicates) length = ${noDupesResult.length} | Expected: 3 | ${noDupesResult.length === 3 ? 'PASS' : 'FAIL'} |`);

console.log('\n=== End of Song Utilities Test Plan ===');