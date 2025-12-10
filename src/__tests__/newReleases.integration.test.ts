import { getLangCode, normalizeSongImage, balanceByLanguage } from '../utils/song';

// Integration tests for new releases functionality
// These tests verify that the new releases section correctly:
// 1. Limits to 25 songs
// 2. Excludes English songs
// 3. Balances languages (ML, TA, HI)
// 4. Normalizes images correctly

// Test case: Balanced distribution (15 ML, 10 TA, 5 HI -> quotas should be [9,8,8])
const createTestSong = (id: string, language: string, imageUrl: string) => ({
  id,
  name: `Song ${id}`,
  language,
  image: [{ quality: '500x500', link: imageUrl }],
  year: '2025'
});

// Test data
const mlSongs = Array.from({ length: 15 }, (_, i) => createTestSong(`ml${i}`, 'malayalam', `https://example.com/ml-${i}.jpg`));
const taSongs = Array.from({ length: 10 }, (_, i) => createTestSong(`ta${i}`, 'tamil', `https://example.com/ta-${i}.jpg`));
const hiSongs = Array.from({ length: 5 }, (_, i) => createTestSong(`hi${i}`, 'hindi', `https://example.com/hi-${i}.jpg`));
const enSongs = Array.from({ length: 10 }, (_, i) => createTestSong(`en${i}`, 'english', `https://example.com/en-${i}.jpg`));

const allSongs = [...mlSongs, ...taSongs, ...hiSongs, ...enSongs];

// Remove duplicates
const uniqueMap = new Map<string, any>();
for (const s of allSongs) {
  if (s && s.id) uniqueMap.set(s.id, s);
}
const uniqueSongs = Array.from(uniqueMap.values());

// Normalize images for all songs
const normalizedSongs = uniqueSongs.map(s => ({
  ...s,
  image: normalizeSongImage(s) || (s as any).image || null
}));

// Filter out English songs for new releases
const newReleasesCandidates = normalizedSongs.filter(s => getLangCode(s.language) !== 'EN');

// Balance languages: ML, TA, HI only
const allowedLanguages = ['ML', 'TA', 'HI'];
const balancedNewReleases = balanceByLanguage(newReleasesCandidates, allowedLanguages, 25);

console.log('New Releases Integration Test Results:');
console.log('- Total songs:', balancedNewReleases.length);
console.log('- ML songs:', balancedNewReleases.filter(s => getLangCode(s.language) === 'ML').length);
console.log('- TA songs:', balancedNewReleases.filter(s => getLangCode(s.language) === 'TA').length);
console.log('- HI songs:', balancedNewReleases.filter(s => getLangCode(s.language) === 'HI').length);
console.log('- English songs:', balancedNewReleases.filter(s => getLangCode(s.language) === 'EN').length);

// Verify all images are normalized
const allImagesNormalized = balancedNewReleases.every(song => {
  return song.image && typeof song.image === 'string';
});

console.log('- All images normalized:', allImagesNormalized);

// Test case: Uneven distribution (ML: 5, TA: 20, HI: 0)
const unevenMLSongs = Array.from({ length: 5 }, (_, i) => createTestSong(`uml${i}`, 'malayalam', `https://example.com/uml-${i}.jpg`));
const unevenTASongs = Array.from({ length: 20 }, (_, i) => createTestSong(`uta${i}`, 'tamil', `https://example.com/uta-${i}.jpg`));

const unevenSongs = [...unevenMLSongs, ...unevenTASongs];

// Remove duplicates
const unevenUniqueMap = new Map<string, any>();
for (const s of unevenSongs) {
  if (s && s.id) unevenUniqueMap.set(s.id, s);
}
const unevenUniqueSongs = Array.from(unevenUniqueMap.values());

// Normalize images
const unevenNormalizedSongs = unevenUniqueSongs.map(s => ({
  ...s,
  image: normalizeSongImage(s) || (s as any).image || null
}));

// Filter out English songs
const unevenNewReleasesCandidates = unevenNormalizedSongs.filter(s => getLangCode(s.language) !== 'EN');

// Balance languages
const unevenBalanced = balanceByLanguage(unevenNewReleasesCandidates, allowedLanguages, 25);

console.log('\nUneven Distribution Test Results:');
console.log('- Total songs:', unevenBalanced.length);
console.log('- ML songs:', unevenBalanced.filter(s => getLangCode(s.language) === 'ML').length);
console.log('- TA songs:', unevenBalanced.filter(s => getLangCode(s.language) === 'TA').length);
console.log('- HI songs:', unevenBalanced.filter(s => getLangCode(s.language) === 'HI').length);

// Image normalization tests
console.log('\nImage Normalization Tests:');

// Test song with array of image objects
const songWithImageArray = {
  id: '1',
  name: 'Test Song',
  image: [
    { quality: '50x50', link: 'https://example.com/small.jpg' },
    { quality: '500x500', link: 'https://example.com/large.jpg' }
  ]
};

const normalizedImage = normalizeSongImage(songWithImageArray);
console.log('- Array image normalized:', normalizedImage === 'https://example.com/large.jpg');

// Test song with string image
const songWithImageString = {
  id: '2',
  name: 'Test Song 2',
  image: 'https://example.com/image.jpg'
};

const normalizedImage2 = normalizeSongImage(songWithImageString);
console.log('- String image normalized:', normalizedImage2 === 'https://example.com/image.jpg');