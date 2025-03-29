import React from 'react';
import { Button } from 'primereact/button';

// Import API_BASE from the same location as other API calls
import { API_BASE } from '../helpers/api';

const Login = () => {
  const handleLogin = () => {
    // Construct login URL from API_BASE
    window.location.href = `${API_BASE}/login`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100%'
    }}>
      <h1>Spotify Visualizer</h1>
      <p>Connect your Spotify account to get started</p>
      <Button
        label="Login with Spotify"
        icon="pi pi-external-link"
        onClick={handleLogin}
        style={{
          backgroundColor: '#1DB954',
          border: 'none',
          marginTop: '20px'
        }}
      />
    </div>
  );
};

export default Login;
