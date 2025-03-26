import React from 'react';
import { Button } from 'primereact/button';

const Login = () => {
  const handleLogin = () => {
    window.location.href = 'http://localhost:3024/login';
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
