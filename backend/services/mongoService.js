const { mongoose } = require('../config/mongodb');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const Analytics = require('../models/Analytics');

class MongoService {
  constructor() {
    this.isConnected = false;
  }

  // Check if MongoDB is available
  async checkConnection() {
    try {
      if (mongoose.connection.readyState === 1) {
        this.isConnected = true;
        return true;
      }
      return false;
    } catch (error) {
      this.isConnected = false;
      return false;
    }
  }

  // User operations
  async createUser(userData) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    const user = new User(userData);
    return await user.save();
  }

  async findUserByEmail(email) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await User.findOne({ email: email.toLowerCase() });
  }

  async findUserById(id) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await User.findById(id);
  }

  async updateUser(id, updateData) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await User.findByIdAndUpdate(id, updateData, { new: true });
  }

  // Playlist operations
  async createPlaylist(playlistData) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    const playlist = new Playlist(playlistData);
    return await playlist.save();
  }

  async getUserPlaylists(userId) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Playlist.find({ owner: userId }).sort({ createdAt: -1 });
  }

  async getPlaylistById(id) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Playlist.findById(id).populate('owner', 'name email');
  }

  async updatePlaylist(id, updateData) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Playlist.findByIdAndUpdate(id, updateData, { new: true });
  }

  async deletePlaylist(id) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Playlist.findByIdAndDelete(id);
  }

  // Song operations
  async createOrUpdateSong(songData) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Song.findOneAndUpdate(
      { songId: songData.songId },
      songData,
      { upsert: true, new: true }
    );
  }

  async findSongById(songId) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Song.findOne({ songId });
  }

  async searchSongs(query, limit = 20) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Song.find({
      $text: { $search: query }
    }).limit(limit);
  }

  async getTrendingSongs(limit = 50) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Song.find()
      .sort({ 'analytics.trending.score': -1 })
      .limit(limit);
  }

  async getPopularSongs(limit = 50) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Song.find()
      .sort({ 'analytics.totalPlays': -1 })
      .limit(limit);
  }

  // Analytics operations
  async logEvent(eventData) {
    if (!await this.checkConnection()) {
      console.warn('MongoDB not available, skipping analytics event');
      return null;
    }
    
    try {
      const analytics = new Analytics(eventData);
      return await analytics.save();
    } catch (error) {
      console.error('Error logging analytics event:', error.message);
      return null;
    }
  }

  async getTopSongs(timeframeDays = 30, limit = 10) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Analytics.getTopSongs(limit, timeframeDays);
  }

  async getUserActivity(userId, timeframeDays = 30) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Analytics.getUserActivity(userId, timeframeDays);
  }

  async getAnalytics(filters = {}, limit = 100) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    return await Analytics.find(filters)
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async getPlayHistory(limit = 1000) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    try {
      const playEvents = await Analytics.find({ eventType: 'song_play' })
        .sort({ timestamp: -1 })
        .limit(limit);
      
      // Convert to the format expected by analytics routes
      return playEvents.map(event => ({
        userId: event.userId,
        userEmail: event.data?.userEmail || 'Unknown',
        songId: event.data?.songId,
        songTitle: event.data?.songTitle,
        artist: event.data?.artist,
        duration: event.data?.duration,
        timestamp: event.timestamp || new Date(),
        date: (event.timestamp ? new Date(event.timestamp) : new Date()).toISOString().split('T')[0]
      }));
    } catch (error) {
      console.error('Error getting play history:', error.message);
      return [];
    }
  }

  // Admin operations
  async getAllUsers(page = 1, limit = 50) {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    const skip = (page - 1) * limit;
    const users = await User.find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments({ isActive: true });
    
    return {
      users,
      total,
      page,
      pages: Math.ceil(total / limit)
    };
  }

  async getSystemStats() {
    if (!await this.checkConnection()) {
      throw new Error('MongoDB not available');
    }
    
    const [userCount, playlistCount, songCount, analyticsCount] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Playlist.countDocuments(),
      Song.countDocuments(),
      Analytics.countDocuments()
    ]);
    
    return {
      users: userCount,
      playlists: playlistCount,
      songs: songCount,
      events: analyticsCount,
      timestamp: new Date()
    };
  }
}

module.exports = new MongoService();