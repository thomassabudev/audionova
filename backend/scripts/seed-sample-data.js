#!/usr/bin/env node

/**
 * Seed Sample Data Script
 * Adds sample users, playlists, and songs for testing
 * Run: node scripts/seed-sample-data.js
 */

const { connectToMongoDB } = require('../config/mongodb');
const User = require('../models/User');
const Playlist = require('../models/Playlist');
const Song = require('../models/Song');
const Analytics = require('../models/Analytics');

async function seedSampleData() {
  console.log('🌱 Starting sample data seeding...');
  
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    console.log('✅ Connected to MongoDB');

    // Check if data already exists
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log('ℹ️ Sample data already exists. Skipping...');
      console.log(`Found ${existingUsers} users in database`);
      process.exit(0);
    }

    // Sample Users
    console.log('👥 Creating sample users...');
    const sampleUsers = [
      {
        email: 'demo@audionova.com',
        name: 'Demo User',
        password: 'demo123456',
        preferences: {
          theme: 'dark',
          language: 'en',
          volume: 0.8
        }
      },
      {
        email: 'music.lover@example.com',
        name: 'Music Lover',
        password: 'music123456',
        preferences: {
          theme: 'light',
          language: 'en',
          volume: 0.9
        }
      }
    ];

    const createdUsers = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${createdUsers.length} sample users`);

    // Sample Songs (based on popular Indian songs)
    console.log('🎵 Creating sample songs...');
    const sampleSongs = [
      {
        songId: 'sample_song_1',
        name: 'Tum Hi Ho',
        album: {
          id: 'album_1',
          name: 'Aashiqui 2',
          url: 'https://example.com/album1'
        },
        year: '2013',
        duration: 262,
        primaryArtists: 'Arijit Singh',
        language: 'Hindi',
        playCount: 150,
        analytics: {
          totalPlays: 150,
          uniqueListeners: 45,
          trending: {
            score: 85,
            lastUpdated: new Date()
          }
        }
      },
      {
        songId: 'sample_song_2',
        name: 'Kal Ho Naa Ho',
        album: {
          id: 'album_2',
          name: 'Kal Ho Naa Ho',
          url: 'https://example.com/album2'
        },
        year: '2003',
        duration: 326,
        primaryArtists: 'Sonu Nigam',
        language: 'Hindi',
        playCount: 200,
        analytics: {
          totalPlays: 200,
          uniqueListeners: 60,
          trending: {
            score: 90,
            lastUpdated: new Date()
          }
        }
      },
      {
        songId: 'sample_song_3',
        name: 'Vande Mataram',
        album: {
          id: 'album_3',
          name: 'Vande Mataram',
          url: 'https://example.com/album3'
        },
        year: '1997',
        duration: 354,
        primaryArtists: 'A.R. Rahman',
        language: 'Hindi',
        playCount: 120,
        analytics: {
          totalPlays: 120,
          uniqueListeners: 35,
          trending: {
            score: 75,
            lastUpdated: new Date()
          }
        }
      }
    ];

    const createdSongs = await Song.insertMany(sampleSongs);
    console.log(`✅ Created ${createdSongs.length} sample songs`);

    // Sample Playlists
    console.log('📝 Creating sample playlists...');
    const samplePlaylists = [
      {
        name: 'My Favorites',
        description: 'A collection of my favorite songs',
        owner: createdUsers[0]._id,
        songs: [
          {
            songId: 'sample_song_1',
            addedBy: createdUsers[0]._id
          },
          {
            songId: 'sample_song_2',
            addedBy: createdUsers[0]._id
          }
        ],
        isPublic: true,
        tags: ['favorites', 'bollywood']
      },
      {
        name: 'Chill Vibes',
        description: 'Relaxing songs for a peaceful mood',
        owner: createdUsers[1]._id,
        songs: [
          {
            songId: 'sample_song_2',
            addedBy: createdUsers[1]._id
          },
          {
            songId: 'sample_song_3',
            addedBy: createdUsers[1]._id
          }
        ],
        isPublic: false,
        tags: ['chill', 'relaxing']
      }
    ];

    const createdPlaylists = await Playlist.insertMany(samplePlaylists);
    console.log(`✅ Created ${createdPlaylists.length} sample playlists`);

    // Sample Analytics
    console.log('📊 Creating sample analytics...');
    const sampleAnalytics = [
      {
        eventType: 'song_play',
        userId: createdUsers[0]._id,
        data: {
          songId: 'sample_song_1',
          duration: 262,
          source: 'playlist'
        }
      },
      {
        eventType: 'playlist_create',
        userId: createdUsers[0]._id,
        data: {
          playlistId: createdPlaylists[0]._id.toString()
        }
      },
      {
        eventType: 'search',
        userId: createdUsers[1]._id,
        data: {
          searchQuery: 'arijit singh'
        }
      }
    ];

    const createdAnalytics = await Analytics.insertMany(sampleAnalytics);
    console.log(`✅ Created ${createdAnalytics.length} sample analytics records`);

    console.log('\n🎉 Sample data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Songs: ${createdSongs.length}`);
    console.log(`   Playlists: ${createdPlaylists.length}`);
    console.log(`   Analytics: ${createdAnalytics.length}`);
    
    console.log('\n🔐 Demo Login Credentials:');
    console.log('   Email: demo@audionova.com');
    console.log('   Password: demo123456');

  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  seedSampleData();
}

module.exports = { seedSampleData };