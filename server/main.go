package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/joho/godotenv"
	"go.etcd.io/bbolt"
)

// Add this struct to hold the token response
type SpotifyTokenResponse struct {
	AccessToken    string `json:"access_token"`
	TokenType      string `json:"token_type"`
	ExpiresIn      int    `json:"expires_in"`
	RefreshToken   string `json:"refresh_token"`
	Scope          string `json:"scope"`
}

// Endpoint handler for /login
func login(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Running func: /login")
	baseUrl := "https://accounts.spotify.com/authorize"

	params := url.Values{}
	params.Add("client_id", os.Getenv("SPOTIFY_CLIENT_ID"))
	params.Add("response_type", "code")
	params.Add("redirect_uri", os.Getenv("REDIRECT_URI"))
	params.Add("scope", "user-read-private user-read-email user-read-playback-state user-modify-playback-state playlist-read-collaborative playlist-read-private")
	params.Add("state", "1234567890")
	params.Add("show_dialog", "true")

	finalUrl := fmt.Sprintf("%s?%s", baseUrl, params.Encode())
	fmt.Println(fmt.Sprintf("Routing to this url: %s", finalUrl))

	http.Redirect(w, r, finalUrl, http.StatusFound)
}

// Endpoint handler for /callback
func callback(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Running func: /callback")
	fmt.Println(fmt.Sprintf("Request: %s", r.URL))

	// Pull the access code that came back from spotify user login
	code := r.URL.Query().Get("code")
	fmt.Println(fmt.Sprintf("Code: %s", code))

	// Make a call to convert to a token
	params := url.Values{}
	params.Add("grant_type", "authorization_code")
	params.Add("code", code)
	params.Add("redirect_uri", os.Getenv("REDIRECT_URI"))

	tokenUrl := "https://accounts.spotify.com/api/token"

	req, err := http.NewRequest("POST", tokenUrl, strings.NewReader(params.Encode()))
	if err != nil {
		log.Fatal(err)
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	authString := fmt.Sprintf("%s:%s", os.Getenv("SPOTIFY_CLIENT_ID"), os.Getenv("SPOTIFY_CLIENT_SECRET"))
	encodedAuth := base64.StdEncoding.EncodeToString([]byte(authString))
	req.Header.Add("Authorization", fmt.Sprintf("Basic %s", encodedAuth))

	// Make the request
	fmt.Println("Making request to Spotify token endpoint...")
	fmt.Println(fmt.Sprintf("Request: %s", req.URL))
	fmt.Println(fmt.Sprintf("Request body: %s", params.Encode()))
	fmt.Println(fmt.Sprintf("Authorization: %s", encodedAuth))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatal("Error making request to Spotify token endpoint: ", err)
	}

	// Handle the response
	fmt.Println(fmt.Sprintf("Response: %s", resp.Status))
	fmt.Println(fmt.Sprintf("Response body: %s", resp.Body))
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatal("Error reading response body: ", err)
	}
	fmt.Println("Response body content:", string(body))
	// Reset the response body for later use
	resp.Body = io.NopCloser(bytes.NewBuffer(body))

	defer resp.Body.Close()

	// Parse the response
	var tokenResponse SpotifyTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		log.Printf("Error decoding response: %v", err)
		http.Error(w, "Failed to decode response", http.StatusInternalServerError)
		return
	}

	// Now you can access the parsed response
	fmt.Printf("Access Token: %s\n", tokenResponse.AccessToken)
	fmt.Printf("Token Type: %s\n", tokenResponse.TokenType)
	fmt.Printf("Expires In: %d seconds\n", tokenResponse.ExpiresIn)
	fmt.Printf("Scope: %s\n", tokenResponse.Scope)

	// Store the token in bbolt and get a session ID
	if tokenResponse.AccessToken != "" {
		sessionID, err := StoreSession(db, tokenResponse)
		if err != nil {
			log.Printf("Error storing session: %v", err)
			http.Error(w, "Failed to create session", http.StatusInternalServerError)
			return
		}

		// Redirect to the frontend with the session ID instead of the token
		route := fmt.Sprintf("%s?session_id=%s", os.Getenv("FRONTEND_URL"), sessionID)
		fmt.Println(fmt.Sprintf("Redirecting to: %s", route))
		http.Redirect(w, r, route, http.StatusFound)
		return
	}

	http.Error(w, "No access token received", http.StatusBadRequest)
}

// Endpoint handler for /data
func data(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	fmt.Println("\n\nRunning func: /data")

	// Add CORS headers
	w.Header().Set("Access-Control-Allow-Origin", os.Getenv("FRONTEND_URL"))
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "No session ID provided"}`))
		return
	}

	// Get the session from bbolt
	session, err := GetSession(db, sessionID)
	if err != nil {
		log.Printf("Error retrieving session: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Invalid or expired session"}`))
		return
	}

	accessToken := session.Token.AccessToken
	fmt.Println(fmt.Sprintf("Retrieved access token for session: %s", sessionID))

	// Directly get the current user's playlists without needing the user profile
	fmt.Println("Fetching current user's playlists")
	body, err := GetCurrentUserPlaylists(accessToken)
	if err != nil {
		log.Printf("Error getting user playlists: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Failed to fetch user playlists"}`))
		return
	}

	// Set content type header to application/json
	w.Header().Set("Content-Type", "application/json")

	// Write the JSON response directly to the ResponseWriter
	w.Write(body)

	elapsed := time.Since(start)
	fmt.Printf("Data function took %s\n", elapsed)
}

func user(w http.ResponseWriter, r *http.Request) {
	// Add CORS headers
	w.Header().Set("Access-Control-Allow-Origin", os.Getenv("FRONTEND_URL"))
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	fmt.Println("Running func: /user")
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		http.Error(w, "No session ID provided", http.StatusBadRequest)
		return
	}

	// Get the session from bbolt
	session, err := GetSession(db, sessionID)
	if err != nil {
		log.Printf("Error retrieving session: %v", err)
		http.Error(w, "Invalid or expired session", http.StatusUnauthorized)
		return
	}

	accessToken := session.Token.AccessToken
	userProfileBody, err := GetUserProfile(accessToken)
	if err != nil {
		log.Printf("Error getting user profile: %v", err)
		http.Error(w, "Failed to fetch user data", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(userProfileBody)
}

// Endpoint handler for /logout
func logout(w http.ResponseWriter, r *http.Request) {
	// Add CORS headers
	w.Header().Set("Access-Control-Allow-Origin", os.Getenv("FRONTEND_URL"))
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Only allow POST requests
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	fmt.Println("Running func: /logout")
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		http.Error(w, "No session ID provided", http.StatusBadRequest)
		return
	}

	// Delete the session
	err := DeleteSession(db, sessionID)
	if err != nil {
		log.Printf("Error deleting session: %v", err)
		http.Error(w, "Failed to logout", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Logged out successfully"}`))
}

// Endpoint handler for /playlist/{playlistId}
func playlistTracks(w http.ResponseWriter, r *http.Request) {
	fmt.Println("\n\nRunning func: /playlist/{playlistId}")

	// Add CORS headers
	w.Header().Set("Access-Control-Allow-Origin", os.Getenv("FRONTEND_URL"))
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	// Handle preflight OPTIONS request
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Extract the playlist ID from the URL path
	// URL format: /playlist/{playlistId}
	urlPath := r.URL.Path
	pathParts := strings.Split(urlPath, "/")

	// Check if path has enough parts
	if len(pathParts) < 3 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "Invalid URL format, expected /playlist/{playlistId}"}`))
		return
	}

	playlistID := pathParts[2]
	sessionID := r.URL.Query().Get("session_id")

	if sessionID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "No session ID provided"}`))
		return
	}

	if playlistID == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error": "No playlist ID provided in URL path"}`))
		return
	}

	// Get the session from bbolt
	session, err := GetSession(db, sessionID)
	if err != nil {
		log.Printf("Error retrieving session: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error": "Invalid or expired session"}`))
		return
	}

	accessToken := session.Token.AccessToken
	fmt.Println(fmt.Sprintf("Retrieved access token for session: %s", sessionID))

	// Get the playlist tracks
	fmt.Println(fmt.Sprintf("Fetching tracks for playlist: %s", playlistID))
	body, err := GetPlaylistTracks(playlistID, accessToken)
	if err != nil {
		log.Printf("Error getting playlist tracks: %v", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error": "Failed to fetch playlist tracks"}`))
		return
	}

	// Set content type header to application/json
	w.Header().Set("Content-Type", "application/json")

	// Write the JSON response directly to the ResponseWriter
	w.Write(body)
}

// Global database variable
var (
	db  *bbolt.DB
	rdb *redis.Client
	ctx = context.Background()  // Global context
)

func init() {
	// Check environment variables
	if err := checkEnv(); err != nil {
		log.Fatalf("Environment setup error: %v", err)
	}

	// Initialize Redis client
	opt, _ := redis.ParseURL(os.Getenv("REDIS_URI"))
	rdb = redis.NewClient(opt)

	// Test Redis connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	fmt.Println("Connected to Redis!")
}

// checkEnv loads the environment variables and verifies required variables exist
func checkEnv() error {
	// Try to load .env file from current directory
	err := godotenv.Load()
	if err != nil {
		log.Printf("Warning: Error loading .env file from current directory: %v", err)
		// Try looking for .env in the server directory
		err = godotenv.Load("server/.env")
		if err != nil {
			log.Printf("Warning: Error loading .env file from server/ directory: %v", err)
		}
	}

	// Check for required environment variables
	requiredEnvVars := []string{"SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "REDIRECT_URI", "FRONTEND_URL", "REDIS_URI"}
	missingVars := []string{}

	for _, envVar := range requiredEnvVars {
		if os.Getenv(envVar) == "" {
			missingVars = append(missingVars, envVar)
		}
	}

	if len(missingVars) > 0 {
		return fmt.Errorf("missing required environment variables: %v", missingVars)
	}

	// Get global variables from environment
	log.Printf("Using frontend URL: %s", os.Getenv("FRONTEND_URL"))

	return nil
}

func main() {
	// Initialize the database
	var err error
	db, err = InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()
	defer rdb.Close()

	// Start a goroutine to clean up expired sessions periodically
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			if err := CleanupExpiredSessions(db); err != nil {
				log.Printf("Error cleaning up expired sessions: %v", err)
			}
		}
	}()

	// Create file server for the entire build directory
	fs := http.FileServer(http.Dir("../frontend/build"))

	// API routes first
	http.HandleFunc("/login", login)
	http.HandleFunc("/callback", callback)
	http.HandleFunc("/data", data)
	http.HandleFunc("/user", user)
	http.HandleFunc("/logout", logout)
	http.HandleFunc("/playlist/", playlistTracks)

	// Serve the frontend app
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("Request for path: %s\n", r.URL.Path)

		// Check if the file exists in the build directory
		path := "../frontend/build" + r.URL.Path
		_, err := os.Stat(path)

		// If the file exists, serve it directly
		if err == nil {
			fmt.Printf("Serving static file: %s\n", path)
			fs.ServeHTTP(w, r)
			return
		}

		// For known static files that should be there, return 404 if not found
		if strings.HasPrefix(r.URL.Path, "/static/") ||
		   strings.HasSuffix(r.URL.Path, ".ico") ||
		   strings.HasSuffix(r.URL.Path, ".json") {
			fmt.Printf("File not found: %s\n", path)
			http.NotFound(w, r)
			return
		}

		// For all other requests, serve the React app's index.html (SPA support)
		fmt.Printf("Serving SPA for path: %s\n", r.URL.Path)
		http.ServeFile(w, r, "../frontend/build/index.html")
	})

	log.Println("Server starting on port 3026...")
	log.Println("Serving frontend from ../frontend/build")
	http.ListenAndServe(":3026", nil)
}
