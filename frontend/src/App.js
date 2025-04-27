import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Image } from 'primereact/image';

import { getUserProfile, logoutUser, getUserPlaylists } from './helpers/api.js';

import Login from './components/Login.js';
import UserProfile from './components/UserProfile.js';
import PlaylistsLists from './components/PlaylistsLists.js';
import PlaylistPage from './components/PlaylistPage.js';
import githubMark from './images/github-mark.svg';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [playlists, setPlaylists] = useState(null);
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

  const handleFetchPlaylists = async () => {
    try {
      const data = await getUserPlaylists();
      setPlaylists(data);

      // Store playlists in localStorage for access across components
      localStorage.setItem('user_playlists', JSON.stringify(data));

      toast.current.show({ severity: 'success', summary: 'Success', detail: 'Playlists fetched successfully' });
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch playlists' });
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
          handleFetchPlaylists();
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

  const HomePage = () => (
    <div className="App" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      width: '100%',
    }}>
      <Toast ref={toast} />
      <header className="App-header">
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          display: 'flex',
          gap: '10px',
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
          padding: '20px',
          paddingTop: '50px',
        }}>
          {userProfile && (
            <div className="user-section" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
            }}>
              <UserProfile user={userProfile} />
              <PlaylistsLists
                playlists={playlists}
              />
            </div>
          )}
        </div>
      </header>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/playlist" element={<PlaylistPage />} />
    </Routes>
  );
}

export default App;
