# Spotify Visualizer

A web application that allows users to connect to their Spotify account and visualize their music data.

## Setup

### Prerequisites
- Node.js and npm
- Python 3.6+
- Spotify Developer Account (to get API credentials)

### Spotify API Setup
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Create a new application
3. Note your Client ID and Client Secret
4. Add `http://localhost:3024/callback` as a Redirect URI in your app settings

### Backend Setup
1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your Spotify credentials:
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   REDIRECT_URI=http://localhost:3024/callback
   SESSION_SECRET=any_random_string_for_sessions
   ```

4. Start the backend server:
   ```
   python server.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install npm dependencies:
   ```
   npm install
   ```

3. Start the frontend development server:
   ```
   npm start
   ```

4. The application should now be accessible at http://localhost:3000

## Features
- Spotify authentication using OAuth 2.0
- Session management with Flask
- Access token management (including refresh)
- Example API endpoint to fetch user profile

## Architecture
- **Frontend**: React.js with PrimeReact UI components
- **Backend**: Flask with RESTful API endpoints
- **Authentication**: Spotify OAuth 2.0 flow