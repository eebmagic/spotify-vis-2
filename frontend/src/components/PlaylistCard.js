import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';

const PlaylistCard = memo(({ playlist, onDownloadJson }) => {
  const navigate = useNavigate();

  return (
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
            onClick={() => onDownloadJson(playlist)}
            className="p-button-text"
            size="small"
          />
        </div>
      </div>
    </Card>
  );
});

PlaylistCard.displayName = 'PlaylistCard';

export default PlaylistCard;