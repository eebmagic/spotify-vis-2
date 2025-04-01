import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Divider } from 'primereact/divider';
import { ProgressSpinner } from 'primereact/progressspinner';

const TracksModal = ({ visible, onHide, tracks, playlistName, loading }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDialogVisible, setImageDialogVisible] = useState(false);
  const [avgColor, setAvgColor] = useState(null);
  const [commonColor, setCommonColor] = useState(null);

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

  if (!tracks || !tracks.length) {
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

  return (
    <Dialog
      header={`Tracks for ${playlistName || 'playlist'} (${tracks.length})`}
      visible={visible}
      style={{ width: '80vw', maxWidth: '800px' }}
      onHide={onHide}
      modal
      dismissableMask
    >
      <div className="tracks-container">
        <ScrollPanel style={{ width: '100%', height: '60vh' }} className="custombar1">
          {tracks.length > 0 ? (
            <div className="track-list">
              {tracks.map((item, index) => {
                const track = item.track;
                // const color = item.avgColor;
                if (!track) return null; // Skip empty tracks

                return (
                  <div key={`${track.id}-${index}`} className="track-item">
                    <div className="track-info" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      {track.album.images[0].url && (
                        <div style={{ position: 'relative' }}>
                          <img
                            src={track.album.images[0].url}
                            alt={track.album.name}
                            style={{ width: '80px', height: '80px', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => {
                              setImageDialogVisible(true);
                              setSelectedImage(track.album.images[0].url);
                              setAvgColor(item.avgColor);
                              setCommonColor(item.commonColor);
                            }}
                          />
                          <Dialog
                            visible={imageDialogVisible}
                            onHide={() => setImageDialogVisible(false)}
                            modal
                            style={{ width: '90vw', height: '90vh' }}
                            dismissableMask
                          >
                            <div className="flex flex-column justify-content-center align-items-center" style={{height: '100%', position: 'relative', gap: '10px'}}>
                              <div style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    backgroundColor: `rgb(${avgColor?.R}, ${avgColor?.G}, ${avgColor?.B})`,
                                    display: 'inline-block',
                                    border: '1px solid #fff',
                                    borderRadius: '4px'
                                  }}
                                />
                                <p style={{margin: '0', color: 'black'}}>
                                  Avg RGB: ({avgColor?.R}, {avgColor?.G}, {avgColor?.B})
                                </p>
                              </div>
                              <div style={{borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <span
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    backgroundColor: `rgb(${commonColor?.R}, ${commonColor?.G}, ${commonColor?.B})`,
                                    display: 'inline-block',
                                    border: '1px solid #fff',
                                    borderRadius: '4px'
                                  }}
                                />
                                <p style={{margin: '0', color: 'black'}}>
                                  Common RGB: ({commonColor?.R}, {commonColor?.G}, {commonColor?.B})
                                </p>
                              </div>
                              <div style={{height: '95%'}}>
                                <img
                                  src={selectedImage}
                                  alt="Album Art"
                                  style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}}
                                />
                              </div>
                            </div>
                          </Dialog>
                        </div>
                      )}
                      <div
                          onClick={() => window.open(track.external_urls.spotify, '_blank', 'noopener,noreferrer')}
                          style={{ margin: '0', cursor: 'pointer' }}
                      >
                        <h4
                          style={{ margin: '0' }}
                        >
                          {track.name}
                        </h4>
                        <p style={{ margin: '0' }}>
                          {track.artists?.map(artist => artist.name).join(', ')}
                        </p>
                        <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                          {track.album?.name}
                        </p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0' }}>
                          <span
                            style={{
                              width: '20px',
                              height: '20px',
                              backgroundColor: `rgb(${item.avgColor.R}, ${item.avgColor.G}, ${item.avgColor.B})`,
                              display: 'inline-block',
                              border: '1px solid #ddd',
                              borderRadius: '4px'
                            }}
                          />
                          Average Color: ({item.avgColor.R}, {item.avgColor.G}, {item.avgColor.B})
                        </p>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0' }}>
                          <span
                            style={{
                              width: '20px',
                              height: '20px',
                              backgroundColor: `rgb(${item.commonColor.R}, ${item.commonColor.G}, ${item.commonColor.B})`,
                              display: 'inline-block',
                              border: '1px solid #ddd',
                              borderRadius: '4px'
                            }}
                          />
                          Common Color: ({item.commonColor.R}, {item.commonColor.G}, {item.commonColor.B})
                        </p>
                      </div>
                    </div>
                    {index < tracks.length - 1 && <Divider />}
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