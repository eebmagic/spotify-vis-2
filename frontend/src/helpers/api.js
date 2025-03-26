// const API_BASE = 'https://links.ebolton.site'
const API_BASE = 'http://localhost:3024'

export const getUserProfile = async () => {
    try {
        const accessToken = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE}/user?access_token=${accessToken}`, {
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
