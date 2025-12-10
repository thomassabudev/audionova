/**
 * Integration tests for cover verification service
 * Tests the full flow: search → detail → verify → fallback
 */

const { fetchCoverForSong, verifyFromJioSaavn } = require('../services/coverVerificationService');
const axios = require('axios');

// Mock axios for controlled testing
jest.mock('axios');

describe('Cover Verification Integration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('JioSaavn verification flow', () => {
    test('finds correct candidate when first result matches', async () => {
      // Mock search response
      axios.get.mockImplementation((url) => {
        if (url.includes('/search/songs')) {
          return Promise.resolve({
            data: {
              data: {
                results: [
                  { id: 'correct_123', name: 'Peelings', primaryArtists: 'Navod' },
                  { id: 'wrong_456', name: 'Different Song', primaryArtists: 'Other Artist' },
                ],
              },
            },
          });
        }
        
        // Mock detail response
        if (url.includes('/songs/correct_123')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'correct_123',
                name: 'Peelings',
                primaryArtists: 'Navod',
                language: 'Malayalam',
                image: [
                  { link: 'https://example.com/150x150.jpg' },
                  { link: 'https://example.com/500x500.jpg' },
                ],
              }],
            },
          });
        }
        
        return Promise.reject(new Error('Not found'));
      });
      
      // Mock HEAD request for image validation
      axios.head.mockResolvedValue({
        headers: { 'content-type': 'image/jpeg' },
      });
      
      const result = await verifyFromJioSaavn({
        title: 'Peelings',
        artist: 'Navod',
        language: 'Malayalam',
      });
      
      expect(result).not.toBeNull();
      expect(result.song_id).toBe('correct_123');
      expect(result.source).toBe('saavn');
      expect(result.verified).toBe(true);
      expect(result.cover_url).toContain('500x500.jpg'); // Prefers higher quality
    });
    
    test('skips incorrect candidates and finds correct one', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/search/songs')) {
          return Promise.resolve({
            data: {
              data: {
                results: [
                  { id: 'wrong_1', name: 'Wrong Song 1' },
                  { id: 'wrong_2', name: 'Wrong Song 2' },
                  { id: 'correct_3', name: 'Peelings' },
                ],
              },
            },
          });
        }
        
        if (url.includes('/songs/wrong_1')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'wrong_1',
                name: 'Wrong Song 1',
                primaryArtists: 'Wrong Artist',
                image: [{ link: 'https://example.com/wrong1.jpg' }],
              }],
            },
          });
        }
        
        if (url.includes('/songs/wrong_2')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'wrong_2',
                name: 'Wrong Song 2',
                primaryArtists: 'Wrong Artist',
                image: [{ link: 'https://example.com/wrong2.jpg' }],
              }],
            },
          });
        }
        
        if (url.includes('/songs/correct_3')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'correct_3',
                name: 'Peelings',
                primaryArtists: 'Navod',
                language: 'Malayalam',
                image: [{ link: 'https://example.com/correct.jpg' }],
              }],
            },
          });
        }
        
        return Promise.reject(new Error('Not found'));
      });
      
      axios.head.mockResolvedValue({
        headers: { 'content-type': 'image/jpeg' },
      });
      
      const result = await verifyFromJioSaavn({
        title: 'Peelings',
        artist: 'Navod',
        language: 'Malayalam',
      });
      
      expect(result).not.toBeNull();
      expect(result.song_id).toBe('correct_3');
      expect(result.cover_url).toContain('correct.jpg');
    });
    
    test('rejects candidate with invalid image', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/search/songs')) {
          return Promise.resolve({
            data: {
              data: {
                results: [
                  { id: 'bad_image', name: 'Peelings' },
                  { id: 'good_image', name: 'Peelings' },
                ],
              },
            },
          });
        }
        
        if (url.includes('/songs/bad_image')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'bad_image',
                name: 'Peelings',
                primaryArtists: 'Navod',
                image: [{ link: 'https://example.com/bad.jpg' }],
              }],
            },
          });
        }
        
        if (url.includes('/songs/good_image')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'good_image',
                name: 'Peelings',
                primaryArtists: 'Navod',
                image: [{ link: 'https://example.com/good.jpg' }],
              }],
            },
          });
        }
        
        return Promise.reject(new Error('Not found'));
      });
      
      // First image fails validation, second succeeds
      axios.head.mockImplementation((url) => {
        if (url.includes('bad.jpg')) {
          return Promise.reject({ response: { status: 404 } });
        }
        return Promise.resolve({
          headers: { 'content-type': 'image/jpeg' },
        });
      });
      
      const result = await verifyFromJioSaavn({
        title: 'Peelings',
        artist: 'Navod',
      });
      
      expect(result).not.toBeNull();
      expect(result.song_id).toBe('good_image');
      expect(result.cover_url).toContain('good.jpg');
    });
    
    test('returns null when no candidates match', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/search/songs')) {
          return Promise.resolve({
            data: {
              data: {
                results: [
                  { id: 'wrong_1', name: 'Wrong Song' },
                  { id: 'wrong_2', name: 'Another Wrong Song' },
                ],
              },
            },
          });
        }
        
        if (url.includes('/songs/')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'wrong',
                name: 'Wrong Song',
                primaryArtists: 'Wrong Artist',
                image: [{ link: 'https://example.com/wrong.jpg' }],
              }],
            },
          });
        }
        
        return Promise.reject(new Error('Not found'));
      });
      
      const result = await verifyFromJioSaavn({
        title: 'Peelings',
        artist: 'Navod',
      });
      
      expect(result).toBeNull();
    });
  });
  
  describe('Fallback sequence', () => {
    test('falls back to iTunes when JioSaavn fails', async () => {
      // JioSaavn returns no results
      axios.get.mockImplementation((url) => {
        if (url.includes('jiosaavn')) {
          return Promise.resolve({
            data: { data: { results: [] } },
          });
        }
        
        // iTunes returns result
        if (url.includes('itunes.apple.com')) {
          return Promise.resolve({
            data: {
              results: [{
                trackId: 12345,
                trackName: 'Peelings',
                artistName: 'Navod',
                artworkUrl100: 'https://itunes.com/100x100.jpg',
              }],
            },
          });
        }
        
        return Promise.reject(new Error('Not found'));
      });
      
      axios.head.mockResolvedValue({
        headers: { 'content-type': 'image/jpeg' },
      });
      
      const result = await fetchCoverForSong({
        title: 'Peelings',
        artist: 'Navod',
      });
      
      expect(result.source).toBe('itunes');
      expect(result.song_id).toBe('itunes_12345');
      expect(result.verified).toBe(true);
    });
    
    test('returns null when all sources fail', async () => {
      // All sources return no results
      axios.get.mockResolvedValue({
        data: { data: { results: [] }, results: [], recordings: [] },
      });
      
      const result = await fetchCoverForSong({
        title: 'Nonexistent Song',
        artist: 'Unknown Artist',
      });
      
      expect(result.verified).toBe(false);
      expect(result.source).toBe('none');
      expect(result.error).toBeTruthy();
    });
  });
  
  describe('Language matching', () => {
    test('rejects candidate with wrong language', async () => {
      axios.get.mockImplementation((url) => {
        if (url.includes('/search/songs')) {
          return Promise.resolve({
            data: {
              data: {
                results: [{ id: 'song_1', name: 'Peelings' }],
              },
            },
          });
        }
        
        if (url.includes('/songs/song_1')) {
          return Promise.resolve({
            data: {
              data: [{
                id: 'song_1',
                name: 'Peelings',
                primaryArtists: 'Navod',
                language: 'Tamil', // Wrong language
                image: [{ link: 'https://example.com/image.jpg' }],
              }],
            },
          });
        }
        
        return Promise.reject(new Error('Not found'));
      });
      
      const result = await verifyFromJioSaavn({
        title: 'Peelings',
        artist: 'Navod',
        language: 'Malayalam', // Expecting Malayalam
      });
      
      expect(result).toBeNull();
    });
  });
});
