// Store authentication state
let isAuthenticated = false;

export const getAuthStatus = () => {
  return isAuthenticated;
};

export const setAuthStatus = (status) => {
  isAuthenticated = status;
};

// Check if user is authenticated on app load
export const checkAuth = async () => {
  try {
    const response = await fetch('http://localhost:3024/check-auth', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      setAuthStatus(data.authenticated);
      return data.authenticated;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Logout function
export const logout = async () => {
  try {
    await fetch('http://localhost:3024/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setAuthStatus(false);
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
