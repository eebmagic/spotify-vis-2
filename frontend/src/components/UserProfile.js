import React from 'react';
import { Card } from 'primereact/card';

const UserProfile = ({ user }) => {
  if (!user) {
    return null;
  }

  return (
    <a href={user.external_urls.spotify} target="_blank" rel="noopener noreferrer">
      <Card className="user-profile-card" style={{
        width: '200px',
        height: '200px',
        marginBottom: '20px',
      }}>
        <div className="flex flex-column align-items-center">
          {user.images && user.images.length > 0 && (
            <img
              src={user.images[0].url}
              alt={user.display_name}
              style={{ width: '80px', height: '80px', marginBottom: '10px' }}
            />
          )}
          <h3 style={{ margin: '8px 0' }}>{user.display_name}</h3>
        </div>
      </Card>
    </a>
  );
};

export default UserProfile;