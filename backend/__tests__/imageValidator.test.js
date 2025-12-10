/**
 * Unit tests for image validation utilities
 */

const { validateImageUrl } = require('../utils/imageValidator');
const axios = require('axios');

// Mock axios
jest.mock('axios');

describe('validateImageUrl', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('validates valid image URL with HEAD request', async () => {
    axios.head.mockResolvedValue({
      headers: { 'content-type': 'image/jpeg' },
    });
    
    const result = await validateImageUrl('https://example.com/image.jpg');
    
    expect(result.valid).toBe(true);
    expect(result.contentType).toBe('image/jpeg');
    expect(axios.head).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      expect.objectContaining({ timeout: 5000 })
    );
  });
  
  test('validates different image types', async () => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    for (const type of imageTypes) {
      axios.head.mockResolvedValue({
        headers: { 'content-type': type },
      });
      
      const result = await validateImageUrl('https://example.com/image');
      expect(result.valid).toBe(true);
      expect(result.contentType).toBe(type);
    }
  });
  
  test('rejects non-image content-type', async () => {
    axios.head.mockResolvedValue({
      headers: { 'content-type': 'text/html' },
    });
    
    const result = await validateImageUrl('https://example.com/page.html');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid content-type');
  });
  
  test('falls back to GET request when HEAD fails', async () => {
    axios.head.mockRejectedValue(new Error('HEAD not allowed'));
    axios.get.mockResolvedValue({
      headers: { 'content-type': 'image/png' },
    });
    
    const result = await validateImageUrl('https://example.com/image.png');
    
    expect(result.valid).toBe(true);
    expect(result.contentType).toBe('image/png');
    expect(axios.get).toHaveBeenCalledWith(
      'https://example.com/image.png',
      expect.objectContaining({
        responseType: 'arraybuffer',
        headers: { 'Range': 'bytes=0-1023' },
      })
    );
  });
  
  test('handles 404 errors', async () => {
    axios.head.mockRejectedValue({
      response: { status: 404 },
    });
    axios.get.mockRejectedValue({
      response: { status: 404 },
    });
    
    const result = await validateImageUrl('https://example.com/missing.jpg');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('404');
  });
  
  test('handles network errors', async () => {
    axios.head.mockRejectedValue(new Error('Network error'));
    axios.get.mockRejectedValue(new Error('Network error'));
    
    const result = await validateImageUrl('https://example.com/image.jpg');
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Request failed');
  });
  
  test('handles empty URL', async () => {
    const result = await validateImageUrl('');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No URL provided');
    expect(axios.head).not.toHaveBeenCalled();
  });
  
  test('handles null URL', async () => {
    const result = await validateImageUrl(null);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No URL provided');
  });
  
  test('respects custom timeout', async () => {
    axios.head.mockResolvedValue({
      headers: { 'content-type': 'image/jpeg' },
    });
    
    await validateImageUrl('https://example.com/image.jpg', 3000);
    
    expect(axios.head).toHaveBeenCalledWith(
      'https://example.com/image.jpg',
      expect.objectContaining({ timeout: 3000 })
    );
  });
  
  test('handles 206 Partial Content for GET request', async () => {
    axios.head.mockRejectedValue(new Error('HEAD not allowed'));
    axios.get.mockResolvedValue({
      status: 206,
      headers: { 'content-type': 'image/jpeg' },
    });
    
    const result = await validateImageUrl('https://example.com/image.jpg');
    
    expect(result.valid).toBe(true);
  });
});
