// const API_BASE = 'https://links.ebolton.site'
const API_BASE = 'http://localhost:3024'

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
