import React from 'react';
import { Card } from 'primereact/card';
import { Avatar } from 'primereact/avatar';
import { Divider } from 'primereact/divider';

const UserProfile = ({ user }) => {
  if (!user) {
    return null;
  }

  return (
    <Card className="user-profile-card" style={{ width: '300px', marginBottom: '20px' }}>
      <div className="flex flex-column align-items-center">
        {user.images && user.images.length > 0 ? (
          <Avatar 
            image={user.images[0].url} 
            shape="circle" 
            size="large" 
            style={{ width: '80px', height: '80px', marginBottom: '10px' }} 
          />
        ) : (
          <Avatar 
            icon="pi pi-user" 
            shape="circle" 
            size="large" 
            style={{ width: '80px', height: '80px', marginBottom: '10px' }} 
          />
        )}
        <h3 style={{ margin: '8px 0' }}>{user.display_name}</h3>
        <span className="text-sm text-color-secondary">{user.email}</span>
        
        <Divider />
        
        <div style={{ width: '100%' }}>
          <div className="flex justify-content-between">
            <span className="font-semibold">Followers:</span>
            <span>{user.followers?.total || 0}</span>
          </div>
          <div className="flex justify-content-between">
            <span className="font-semibold">Country:</span>
            <span>{user.country || 'N/A'}</span>
          </div>
          <div className="flex justify-content-between">
            <span className="font-semibold">Account Type:</span>
            <span style={{ textTransform: 'capitalize' }}>{user.product || 'N/A'}</span>
          </div>
          {user.external_urls?.spotify && (
            <div className="mt-3">
              <a 
                href={user.external_urls.spotify} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: '#1DB954' }}
              >
                View Spotify Profile
              </a>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default UserProfile;