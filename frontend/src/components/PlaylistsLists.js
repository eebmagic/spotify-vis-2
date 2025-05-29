import React, { useState, useMemo } from 'react';
import { InputText } from 'primereact/inputtext';
import Fuse from 'fuse.js';
import PlaylistCard from './PlaylistCard';

const PlaylistsLists = ({ playlists }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Make sure we have the items property that contains playlists
  const playlistItems = playlists?.items || [];

  // Configure Fuse.js options for fuzzy search
  const fuseOptions = {
    keys: [
      'name',
      'description',
      'owner.display_name',
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2
  };

  const fuse = useMemo(() => new Fuse(playlistItems, fuseOptions), [playlistItems]);

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery) {
      return playlistItems;
    }
    const results = fuse.search(searchQuery.trim());
    const out = results.map(result => result.item);
    return out;
  }, [searchQuery, fuse, playlistItems]);

  // Memoized playlist cards rendering
  const playlistCards = useMemo(() => {
    const result = filteredPlaylists.map((playlist) => (
      <PlaylistCard
        key={playlist.id}
        playlist={playlist}
      />
    ));
    return result;
  }, [filteredPlaylists]);

  return (
    <>
        <div className="playlists-container">
          {/* Search input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <InputText
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlists by title, description, or owner name..."
              className="w-full"
              style={{ width: '100%', padding: '0.75rem' }}
            />
          </div>

          {playlistItems.length === 0 ? (
            <div className="empty-playlists">
              <p>{searchQuery.trim() ? 'No playlists match your search.' : 'No playlists found.'}</p>
            </div>
          ) : (
            <div>
              <h3>
                {searchQuery.trim() ?
                  `Found ${filteredPlaylists.length} of ${playlistItems.length} playlists` :
                  `Total Playlists: ${playlistItems.length}`
                }
              </h3>
              <div className="playlist-list">
                {playlistCards}
              </div>
            </div>
          )}
        </div>
    </>
  );
};

export default PlaylistsLists;