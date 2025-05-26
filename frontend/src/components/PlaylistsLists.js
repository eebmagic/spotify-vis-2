import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import Fuse from 'fuse.js';

const PlaylistsLists = ({ playlists }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Make sure we have the items property that contains playlists
  const playlistItems = playlists?.items || [];

  // Configure Fuse.js options for fuzzy search
  const fuseOptions = {
    keys: [
      'name',
      'description',
    ],
    threshold: 0.4,
    includeScore: true,
    minMatchCharLength: 2
  };

  const fuse = useMemo(() => new Fuse(playlistItems, fuseOptions), [playlistItems]);

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (searchQuery.trim().length === 0) {
      console.log('No search query! Returning all playlists.');
      return playlistItems;
    }
    
    const results = fuse.search(searchQuery.trim());
    return results.map(result => result.item);
  }, [searchQuery, fuse, playlistItems]);

  if (!playlists) return null;

  const formatJson = (json) => {
    return JSON.stringify(json, null, 2);
  };

  /*
  Supports the "View Playlist JSON" button.
  Downloads the playlist data as a JSON file to the user's device.
  */
  const downloadPlaylistJson = (playlist) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
      formatJson(playlist)
    );
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `playlist-${playlist.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <>
        <div className="playlists-container">
          {/* Search input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <InputText
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search playlists by title or description..."
              className="w-full"
              style={{ width: '100%', padding: '0.75rem' }}
            />
          </div>

          {/* <ScrollPanel style={{ width: '100%', height: '60vh' }} className="custombar1"> */}
            {playlistItems.length > 0 ? (
              <div>
                <h3>
                  {searchQuery.trim() ? 
                    `Found ${filteredPlaylists.length} of ${playlistItems.length} playlists` : 
                    `Total Playlists: ${playlistItems.length}`
                  }
                </h3>
                <div className="playlist-list">
                  {filteredPlaylists.map((playlist, index) => (
                    <Card
                      key={playlist.id}
                      className="playlist-item"
                      style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        width: '40rem',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        gap: '1rem',
                      }}>
                        {/* Playlist info */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start',
                        }}>
                          {playlist.images && playlist.images.length > 0 && (
                            <img
                              src={playlist.images[0].url}
                              alt={playlist.name}
                              style={{ width: '10rem', height: '10rem', borderRadius: '4px' }}
                            />
                          )}

                          {/* Playlist metadata text */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                            marginLeft: '1rem',
                            gap: '0.5rem',
                          }}>
                            <h3 className="m-0">{playlist.name}</h3>
                            <b className="m-0 mb-2" style={{ fontSize: '0.8rem' }}>Tracks: {playlist.tracks?.total || 0}</b>
                            <b className="m-0 mb-2" style={{ fontSize: '0.8rem' }}>Owner: {playlist.owner?.display_name || 'Unknown'}</b>
                            {playlist.description && <p className="m-0 mb-2" style={{ fontSize: '0.8rem' }}>Description: {playlist.description}</p>}
                          </div>
                        </div>
                        
                        {/* Playlist actions */}
                        <div className="flex gap-2 flex-wrap mt-5" style={{marginTop: '1rem'}}>
                          <Button
                            label="Color Wheel View"
                            icon="pi pi-chart-pie"
                            onClick={() => {
                              navigate(`/playlist?id=${playlist.id}`);
                            }}
                            className="p-button-outlined p-button-info"
                            size="small"
                          />
                          <Button
                            label="View Playlist JSON"
                            icon="pi pi-code"
                            onClick={() => downloadPlaylistJson(playlist)}
                            className="p-button-text"
                            size="small"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-playlists">
                <p>{searchQuery.trim() ? 'No playlists match your search.' : 'No playlists found.'}</p>
              </div>
            )}
          {/* </ScrollPanel> */}
        </div>
    </>
  );
};

export default PlaylistsLists;