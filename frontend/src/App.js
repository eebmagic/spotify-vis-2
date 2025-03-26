import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';

import Post from './components/Post.js';
import Link from './components/Link.js';
import Login from './components/Login.js';
import UserProfile from './components/UserProfile.js';
import { getLinks, getUserProfile } from './helpers/api.js';
import { checkAuth, logout } from './helpers/auth.js';
import githubMark from './images/github-mark.svg';

function App() {
  const [links, setLinks] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const toast = useRef(null);

  useEffect(() => {
    const initializeAuth = async () => {
      // Check URL for access token first
      const urlParams = new URLSearchParams(window.location.search);
      const accessToken = urlParams.get('access_token');
      
      if (accessToken) {
        // Store the token and clean up URL
        localStorage.setItem('access_token', accessToken);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      let authed = accessToken ? true : false;
      if (localStorage.getItem('access_token')) {
        authed = true;
      }

      setIsAuthenticated(authed);
      setLoading(false);
      
      // Get callback status from URL if present
      const status = urlParams.get('status');
      const message = urlParams.get('message');
      
      if (status && message) {
        showToast(
          status === 'success' ? 'success' : 'error',
          status === 'success' ? 'Success' : 'Error',
          message
        );
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      // if (authStatus) {
      //   fetchLinks();
      //   fetchUserProfile();
      // }
    };
    
    initializeAuth();
  }, []);
  
  const fetchUserProfile = async () => {
    try {
      const profileData = await getUserProfile();
      setUserProfile(profileData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      showToast('error', 'Error', 'Failed to load user profile');
    }
  };

  const fetchLinks = async () => {
    try {
      const result = await getLinks();
      setLinks(result);
    } catch (error) {
      console.error('Error fetching links:', error);
    }
  };

  const handleDelete = (idx) => {
    setLinks(links.filter(link => link.idx !== idx));
  };

  const showToast = (severity, summary, detail) => {
    console.log(`Showing toast for: ${summary} - ${detail}`);
    toast.current.show({
      severity: severity,
      summary: summary,
      detail: detail,
      life: 3000
    });
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    showToast('info', 'Logged Out', 'You have been successfully logged out');
  };

  if (loading) {
    return <div className="App">Loading...</div>;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, returning the Login modal');
    return <Login />;
  } else {
    console.log('Authenticated, returning the main app');
    return 'Hello, World! Should get playlist data here';
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
            href="https://github.com/eebmagic/link-board"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={githubMark} alt="GitHub Mark" style={{ width: '30px', height: '30px', filter: 'invert(100%)' }} />
          </a>
          <Button
            icon="pi pi-sign-out"
            severity="secondary"
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
          
          {/* Your other app content here */}
          <div className="main-content">
            {/* Main app content will go here */}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
