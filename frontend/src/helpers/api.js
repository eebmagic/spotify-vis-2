// Use environment variable with fallback value for local development
export const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3026'

export const getUserProfile = async () => {
    try {
        const sessionId = localStorage.getItem('session_id');
        const response = await fetch(`${API_BASE}/user?session_id=${sessionId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP response error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) return;

        const response = await fetch(`${API_BASE}/logout?session_id=${sessionId}`, {
            method: 'POST',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`HTTP response error: ${response.status}`);
        }

        return true;
    } catch (error) {
        console.error('Error during logout:', error);
        throw error;
    }
};

export const getUserPlaylists = async () => {
    try {
        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) throw new Error('No session ID found');

        const response = await fetch(`${API_BASE}/data?session_id=${sessionId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP response error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user playlists:', error);
        throw error;
    }
};

export const getPlaylistTracks = async (playlistId) => {
    try {
        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) throw new Error('No session ID found');
        if (!playlistId) throw new Error('No playlist ID provided');

        const response = await fetch(`${API_BASE}/playlist/${playlistId}?session_id=${sessionId}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP response error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching playlist tracks:', error);
        throw error;
    }
};

export const getPlaylistDetails = async (playlistId) => {
    try {
        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) throw new Error('No session ID found');
        if (!playlistId) throw new Error('No playlist ID provided');

        // Get playlist data from storage
        const playlists = localStorage.getItem('user_playlists');
        if (playlists) {
            const parsedPlaylists = JSON.parse(playlists);
            if (parsedPlaylists.items) {
                const playlist = parsedPlaylists.items.find(p => p.id === playlistId);
                if (playlist) {
                    return playlist;
                }
            }
        }

        console.log('PLAYLIST NOT FOUND IN STORAGE: ', playlistId);
        console.log('Returning null (TODO: Implement API call to fetch playlist details)');
        return null;
    } catch (error) {
        console.error('Error fetching playlist details:', error);
        throw error;
    }
};
