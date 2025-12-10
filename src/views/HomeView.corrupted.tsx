        {/* Tamil */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Tamil Hits</h2>
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setShowAllTamil(!showAllTamil)}>
              {showAllTamil ? 'Show Less' : 'See All'}
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {tamilSongs.slice(0, showAllTamil ? 50 : MAX_SMALL_GRID).map((song, idx) => (
              <motion.div
                key={`tamil-${song.id}`}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * idx, duration: 0.28 }}
                whileHover={{ y: -5 }}
                onClick={() => setPlaylistAndPlay(convertSongsForPlayer(tamilSongs), idx)}
              >
                <div className="relative">
                  <img 
                    src={getSongImageUrl(song)} 
                    alt={song.name} 
                    className="w-full aspect-square object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getPlaceholderImage(song.name || 'No Image');
                    }}
                  />

                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 shadow-lg"
                      onClick={(e: any) => {
                        e.stopPropagation();
                        setPlaylistAndPlay(convertSongsForPlayer(tamilSongs), idx);
                      }}
                    >
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </Button>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
                      onClick={(e: any) => {
                        e.stopPropagation();
                        if (isSongLiked(song.id)) removeFromLikedSongs(song.id);
                        else addToLikedSongs(song as any);
                      }}
                    >
                      <Heart className={`w-4 h-4 ${isSongLiked(song.id) ? 'fill-current text-red-500' : 'text-white'}`} />
                    </Button>
                  </div>

                  <LanguageBadge language={song.language} />
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-foreground truncate">{song.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{song.primaryArtists}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        </div>
        {/* End content wrapper */}
      </motion.div>
      
      {/* Playlist Sidebar - Attached to the right without blur */}
      <PlaylistSidebar 
        isOpen={isPlaylistSidebarOpen}
        onClose={handleToggleSidebar}
        onPlaylistSelect={(playlist) => {
          setSelectedPlaylist({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            tracks: playlist.tracks,
            image: playlist.image,
            createdAt: playlist.createdAt,
            version: playlist.version
          });
        }}
      />
    </div>
  );
};

export default HomeView;