import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { getPlaylistTracks, getPlaylistDetails } from '../helpers/api';
import TracksColorWheel from './TracksColorWheel';

const PlaylistPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tracks, setTracks] = useState(null);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDetails, setPlaylistDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useRef(null);

  const playlistId = searchParams.get('id');

  // Handle escape key to go back to home page
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        navigate('/');
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [navigate]);

  useEffect(() => {
    if (!playlistId) {
      navigate('/');
      return;
    }

    const fetchPlaylistData = async () => {
      setLoading(true);
      try {
        // Fetch both playlist details and tracks concurrently
        const [details, tracks] = await Promise.all([
          getPlaylistDetails(playlistId),
          getPlaylistTracks(playlistId)
        ]);

        setPlaylistDetails(details);
        setTracks(tracks);

        // Set playlist name from details
        if (details && details.name) {
          setPlaylistName(details.name);
        } else if (tracks && tracks.length > 0) {
          // Fallback options if details are not available
          if (tracks[0].playlist_name) {
            setPlaylistName(tracks[0].playlist_name);
          } else if (tracks.playlist_name) {
            setPlaylistName(tracks.playlist_name);
          } else if (tracks[0].track && tracks[0].track.album && tracks[0].track.album.name) {
            setPlaylistName(tracks[0].track.album.name + ' Playlist');
          } else {
            setPlaylistName('Playlist');
          }
        } else {
          setPlaylistName('Playlist');
        }
      } catch (error) {
        console.error('Error fetching playlist data:', error);
        if (toast.current) {
          toast.current.show({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load playlist'
          });
        }
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylistData();
  }, [playlistId, navigate]);

  if (loading) {
    return (
      <div className="App">
        <div className="App-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', justifyContent: 'left', height: '100vh' }}>
          <ProgressSpinner style={{ width: '50px', height: '50px' }} strokeWidth="5" />
          <p>Loading playlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toast ref={toast} />
      <header className="App-header">
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          display: 'flex',
          gap: '10px'
        }}>
          <Button
            icon="pi pi-arrow-left"
            onClick={() => navigate('/')}
            tooltip="Back to Home"
            tooltipOptions={{ position: 'bottom' }}
            style={{ backgroundColor: 'transparent', border: 'none' }}
          />
        </div>

        <div className="content-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px',
          marginTop: '50px',
          width: '100%'
        }}>
          <div className="playlist-header" style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginBottom: '40px',
            textAlign: 'left',
            width: '90%',
            maxWidth: '900px',
            gap: '25px'
          }}>
            {/* Image on the left */}
            {playlistDetails && playlistDetails.images && playlistDetails.images.length > 0 && (
              <div className="playlist-image" style={{
                marginTop: '10px',
                flexShrink: 0
              }}>
                <img
                  src={playlistDetails.images[0].url}
                  alt={playlistName}
                  style={{
                    width: '220px',
                    height: '220px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    flexShrink: 0
                  }}
                />
              </div>
            )}

            {/* Metadata on the right */}
            <div className="playlist-info" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              flex: 1
            }}>
              <h1 style={{ margin: '0 0 15px 0', fontSize: '2.5rem' }}>{playlistName}</h1>

              {playlistDetails && (
                <div style={{
                  color: '#b3b3b3',
                  marginBottom: '15px',
                  fontSize: '0.95rem'  // Fixed size for all metadata text
                }}>
                  {playlistDetails.owner && (
                    <p style={{ margin: '0 0 5px 0', fontWeight: '500' }}>
                      by: {playlistDetails.owner.display_name || 'Unknown'}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '15px' }}>
                    {playlistDetails.tracks && (
                      <p style={{ margin: '0' }}>
                        {playlistDetails.tracks.total || (tracks ? tracks.length : 0)} tracks
                      </p>
                    )}
                    {playlistDetails.followers && (
                      <p style={{ margin: '0' }}>
                        {playlistDetails.followers.total || 0} followers
                      </p>
                    )}
                  </div>
                </div>
              )}

              {playlistDetails && playlistDetails.external_urls && playlistDetails.external_urls.spotify && (
                <a
                  href={playlistDetails.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: '#1DB954',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    marginTop: '5px',
                    fontSize: '0.9rem'
                  }}
                >
                  Open in Spotify
                </a>
              )}
            </div>
          </div>

          {/* Album covers color wheel canvas */}
          {tracks && (
            <div style={{ width: '90%', maxWidth: '1200px' }}>
              <TracksColorWheel
                visible={true}
                onHide={() => {}} // No-op since we're not in a modal
                tracks={tracks}
                playlistName={playlistName}
                loading={false}
              />
            </div>
          )}
        </div>
      </header>
    </div>
  );
};

export default PlaylistPage;