import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Image } from 'primereact/image';

import { getUserProfile, logoutUser } from './helpers/api.js';

import Login from './components/Login.js';
import UserProfile from './components/UserProfile.js';
import githubMark from './images/github-mark.svg';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const toast = useRef(null);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      localStorage.removeItem('session_id');
      setIsAuthenticated(false);
      toast.current.show({ severity: 'info', summary: 'Logged out', detail: 'You have been logged out' });
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      // Check URL for session ID first
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (sessionId) {
        // Store the session ID and clean up URL
        localStorage.setItem('session_id', sessionId);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      let authed = (sessionId || localStorage.getItem('session_id')) ? true : false;
      if (authed) {
        try {
          const profile = await getUserProfile();
          setUserProfile(profile);
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // If profile fetch fails, user might not be authenticated anymore
          localStorage.removeItem('session_id');
          authed = false;
        }
      }
      setIsAuthenticated(authed);
    };

    fetchUserData();
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
              <UserProfile user={userProfile} />
            </div>
          )}
          
        </div>
      </header>
    </div>
  );
}

export default App;
