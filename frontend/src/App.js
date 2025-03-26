import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Image } from 'primereact/image';

import Login from './components/Login.js';
import githubMark from './images/github-mark.svg';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const toast = useRef(null);

  const handleLogout = async () => {
    localStorage.removeItem('access_token');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    // Check URL for access token first
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    
    if (accessToken) {
      // Store the token and clean up URL
      localStorage.setItem('access_token', accessToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    let authed = (accessToken || localStorage.getItem('access_token')) ? true : false;
    setIsAuthenticated(authed);
  }, []);

  if (!isAuthenticated) {
    console.log('Not authenticated, returning the Login modal');
    return <Login />;
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
          <a
            href="https://github.com/eebmagic/spotify-vis-2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image src={githubMark} alt="GitHub Mark" width={30} height={30} style={{ filter: 'invert(100%)' }} />
          </a>
          <Button
            icon="pi pi-sign-out"
            severity="danger"
            onClick={handleLogout}
            tooltip="Logout"
            tooltipOptions={{ position: 'bottom' }}
            style={{ backgroundColor: 'transparent', border: 'none' }}
          />
        </div>
        
        <div className="content-container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          padding: '20px',
          marginTop: '50px'
        }}>
          {userProfile && (
            <div className="user-section" style={{ marginBottom: '30px' }}>
              <h2>Welcome, {userProfile.display_name}!</h2>
              {/* <UserProfile user={userProfile} /> */}
            </div>
          )}
          
        </div>
      </header>
    </div>
  );
}

export default App;
