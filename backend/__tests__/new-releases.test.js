const request = require('supertest');
const express = require('express');
const newReleasesRouter = require('../routes/new-releases');

// Create a test Express app
const app = express();
app.use(express.json());
app.use('/api/new-releases', newReleasesRouter);

// Mock the database
jest.mock('pg', () => {
  const Client = {
    connect: jest.fn(),
    query: jest.fn(),
    release: jest.fn()
  };
  
  return {
    Pool: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(Client),
      query: jest.fn()
    }))
  };
});

describe('New Releases API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/new-releases', () => {
    it('should return featured new releases', async () => {
      const mockSongs = [
        {
          id: 1,
          external_id: '123',
          title: 'Test Song',
          artists: 'Test Artist',
          album: 'Test Album',
          release_date: new Date(),
          featured: true,
          added_at: new Date()
        }
      ];

      // Mock the database query
      const poolMock = require('pg').Pool;
      poolMock.mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: mockSongs })
      }));

      const response = await request(app)
        .get('/api/new-releases')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Song');
    });

    it('should handle database errors', async () => {
      // Mock database error
      const poolMock = require('pg').Pool;
      poolMock.mockImplementation(() => ({
        query: jest.fn().mockRejectedValue(new Error('Database error'))
      }));

      const response = await request(app)
        .get('/api/new-releases')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch new releases');
    });
  });

  describe('GET /api/new-releases/songs/:id', () => {
    it('should return song details', async () => {
      const mockSong = {
        id: 1,
        external_id: '123',
        title: 'Test Song',
        artists: 'Test Artist',
        album: 'Test Album',
        release_date: new Date(),
        metadata: {},
        featured: true
      };

      // Mock the database query
      const poolMock = require('pg').Pool;
      poolMock.mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: [mockSong] })
      }));

      const response = await request(app)
        .get('/api/new-releases/songs/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Test Song');
    });

    it('should return 404 for non-existent song', async () => {
      // Mock empty result
      const poolMock = require('pg').Pool;
      poolMock.mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: [] })
      }));

      const response = await request(app)
        .get('/api/new-releases/songs/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Song not found');
    });
  });

  describe('GET /api/new-releases/albums/:name', () => {
    it('should return songs from an album', async () => {
      const mockSongs = [
        {
          id: 1,
          external_id: '123',
          title: 'Test Song 1',
          artists: 'Test Artist',
          album: 'Test Album',
          release_date: new Date()
        },
        {
          id: 2,
          external_id: '456',
          title: 'Test Song 2',
          artists: 'Test Artist',
          album: 'Test Album',
          release_date: new Date()
        }
      ];

      // Mock the database query
      const poolMock = require('pg').Pool;
      poolMock.mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: mockSongs })
      }));

      const response = await request(app)
        .get('/api/new-releases/albums/Test%20Album')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].title).toBe('Test Song 1');
    });
  });
});