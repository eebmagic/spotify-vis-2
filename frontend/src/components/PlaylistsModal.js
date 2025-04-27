import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Toast } from 'primereact/toast';

const PlaylistsModal = ({ visible, onHide, playlists }) => {
  const navigate = useNavigate();

  if (!playlists) return null;

  // Make sure we have the items property that contains playlists
  const playlistItems = playlists.items || [];

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
      <Dialog
        header="Your Playlists"
        visible={visible}
        style={{ width: '80vw', maxWidth: '800px' }}
        onHide={onHide}
        modal
        dismissableMask
      >
        <div className="playlists-container">
          <ScrollPanel style={{ width: '100%', height: '60vh' }} className="custombar1">
            {playlistItems.length > 0 ? (
              <div>
                <h3>Total Playlists: {playlistItems.length}</h3>
                <div className="playlist-list">
                  {playlistItems.map((playlist, index) => (
                    <div key={playlist.id} className="playlist-item">
                      <div className="playlist-header">
                        <h3>{playlist.name}</h3>
                        {playlist.images && playlist.images.length > 0 && (
                          <img
                            src={playlist.images[0].url}
                            alt={playlist.name}
                            style={{ width: '60px', height: '60px', borderRadius: '4px' }}
                          />
                        )}
                      </div>
                      <p>Tracks: {playlist.tracks?.total || 0}</p>
                      <p>Owner: {playlist.owner?.display_name || 'Unknown'}</p>
                      <p>{index + 1}</p>
                      {playlist.description && <p>Description: {playlist.description}</p>}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <Button
                          label="View Playlist JSON"
                          icon="pi pi-code"
                          onClick={() => downloadPlaylistJson(playlist)}
                          className="p-button-text"
                          style={{ padding: '0.5rem' }}
                        />
                        <Button
                          label="Color Wheel View"
                          icon="pi pi-chart-pie"
                          onClick={() => {
                            navigate(`/playlist?id=${playlist.id}`);
                          }}
                          className="p-button-outlined p-button-info"
                          style={{ padding: '0.5rem' }}
                        />
                      </div>
                      {index < playlistItems.length - 1 && <Divider />}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-playlists">
                <p>No playlists found.</p>
              </div>
            )}
          </ScrollPanel>
        </div>
      </Dialog>
    </>
  );
};

export default PlaylistsModal;