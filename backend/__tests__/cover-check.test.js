const { checkCover } = require('../worker/cover-checker');
const axios = require('axios');
const sharp = require('sharp');
const imghash = require('imghash');

// Mock dependencies
jest.mock('axios');
jest.mock('sharp');
jest.mock('imghash');

describe('Cover Checker', () => {
    const mockSong = {
        id: '123',
        image: [
            { link: 'http://example.com/150x150.jpg' },
            { link: 'http://example.com/500x500.jpg' },
            { link: 'http://example.com/high.jpg' }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should reject missing cover url', async () => {
        const song = { id: '123', image: [] };
        const result = await checkCover(song);
        expect(result.verified).toBe(false);
        expect(result.reason).toBe('missing_url');
    });

    test('should reject placeholder url', async () => {
        const song = { id: '123', image: [{ link: 'http://example.com/placeholder.jpg' }] };
        const result = await checkCover(song);
        expect(result.verified).toBe(false);
        expect(result.reason).toBe('placeholder_pattern');
    });

    test('should reject if download fails', async () => {
        axios.get.mockRejectedValue(new Error('Network error'));
        const result = await checkCover(mockSong);
        expect(result.verified).toBe(false);
        expect(result.reason).toBe('download_failed');
    });

    test('should pass if pHash is unique', async () => {
        axios.get.mockResolvedValue({ data: Buffer.from('fake-image') });

        // Mock sharp chain
        const mockSharp = {
            resize: jest.fn().mockReturnThis(),
            grayscale: jest.fn().mockReturnThis(),
            toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed'))
        };
        sharp.mockReturnValue(mockSharp);

        // Mock hash
        imghash.hash.mockResolvedValue('1234567890abcdef');

        const result = await checkCover(mockSong);
        expect(result.verified).toBe(true);
        expect(result.method).toBe('phash');
    });

    test('should reject if pHash matches generic', async () => {
        axios.get.mockResolvedValue({ data: Buffer.from('fake-image') });

        const mockSharp = {
            resize: jest.fn().mockReturnThis(),
            grayscale: jest.fn().mockReturnThis(),
            toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed'))
        };
        sharp.mockReturnValue(mockSharp);

        // Mock hash to match '0000000000000000' (generic black)
        imghash.hash.mockResolvedValue('0000000000000001'); // Distance 1

        const result = await checkCover(mockSong);
        expect(result.verified).toBe(false);
        expect(result.reason).toBe('generic_match');
    });
});
