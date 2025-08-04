# Spotify Visualizer

A web application that allows users to connect to their Spotify account and visualize their playlist data through color-based representations of album artwork.

## Features
- Spotify OAuth 2.0 authentication with session management
- User playlist browsing with fuzzy search functionality
- Visual playlist representation using album artwork colors
- Color wheel visualization for playlist tracks
- Async image processing for album artwork color extraction
- Redis caching for improved performance
- Responsive React frontend with PrimeReact components

## Setup

### Prerequisites
- Go 1.23+
- Node.js and npm
- Redis server
- Spotify Developer Account (to get API credentials)

### Spotify API Setup
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/)
2. Create a new application
3. Note your Client ID and Client Secret
4. Add `http://localhost:3026/callback` as a Redirect URI in your app settings

### Backend Setup
1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Create a `.env` file with your credentials:
   ```
   SPOTIFY_CLIENT_ID=your_client_id_here
   SPOTIFY_CLIENT_SECRET=your_client_secret_here
   REDIRECT_URI=http://localhost:3026/callback
   FRONTEND_URL=http://localhost:3026
   REDIS_URI=redis://localhost:6379
   ```

3. Install Go dependencies:
   ```bash
   go mod tidy
   ```

4. Build and run the server:
   ```bash
   # For development (run directly)
   go run .
   
   # Or build a binary
   go build -o spotify-vis
   ./spotify-vis
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Build the frontend:
   ```bash
   npm run build
   ```

4. The Go server serves the built frontend at http://localhost:3026

## Architecture
- **Frontend**: React.js with PrimeReact UI components, React Router for navigation
- **Backend**: Go HTTP server with goroutines for concurrent processing
- **Database**: BoltDB for session storage
- **Cache**: Redis for album color caching
- **Authentication**: Spotify OAuth 2.0 flow with session-based authentication
- **Image Processing**: Server-side color extraction from album artwork