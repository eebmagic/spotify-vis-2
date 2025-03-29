import React from 'react';
import { Dialog } from 'primereact/dialog';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Divider } from 'primereact/divider';
import { ProgressSpinner } from 'primereact/progressspinner';

const TracksModal = ({ visible, onHide, tracks, playlistName, loading }) => {
  if (loading) {
    return (
      <Dialog
        header={`Loading tracks for ${playlistName || 'playlist'}...`}
        visible={visible}
        style={{ width: '80vw', maxWidth: '800px' }}
        onHide={onHide}
        modal
        dismissableMask
      >
        <div className="flex justify-content-center">
          <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="5" />
        </div>
      </Dialog>
    );
  }

  if (!tracks || !tracks.items) {
    return (
      <Dialog
        header={`Tracks for ${playlistName || 'playlist'}`}
        visible={visible}
        style={{ width: '80vw', maxWidth: '800px' }}
        onHide={onHide}
        modal
        dismissableMask
      >
        <div className="p-3">
          <p>No tracks found or there was an error loading the tracks.</p>
        </div>
      </Dialog>
    );
  }

  const trackItems = tracks.items || [];

  return (
    <Dialog
      header={`Tracks for ${playlistName || 'playlist'} (${trackItems.length})`}
      visible={visible}
      style={{ width: '80vw', maxWidth: '800px' }}
      onHide={onHide}
      modal
      dismissableMask
    >
      <div className="tracks-container">
        <ScrollPanel style={{ width: '100%', height: '60vh' }} className="custombar1">
          {trackItems.length > 0 ? (
            <div className="track-list">
              {trackItems.map((item, index) => {
                const track = item.track;
                if (!track) return null; // Skip empty tracks

                return (
                  <div key={`${track.id}-${index}`} className="track-item">
                    <div className="track-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {track.album?.images && track.album.images.length > 0 && (
                        <img
                          src={track.album.images[track.album.images.length > 2 ? 2 : 0].url}
                          alt={track.album.name}
                          style={{ width: '50px', height: '50px', borderRadius: '4px' }}
                        />
                      )}
                      <div>
                        <h4 style={{ margin: '0' }}>{track.name}</h4>
                        <p style={{ margin: '0' }}>
                          {track.artists?.map(artist => artist.name).join(', ')}
                        </p>
                        <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                          {track.album?.name}
                        </p>
                      </div>
                    </div>
                    {index < trackItems.length - 1 && <Divider />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-tracks">
              <p>No tracks found in this playlist.</p>
            </div>
          )}
        </ScrollPanel>
      </div>
    </Dialog>
  );
};

export default TracksModal;