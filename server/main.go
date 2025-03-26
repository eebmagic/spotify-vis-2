package main

import (
	"bytes"
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

	"github.com/joho/godotenv"
)

// Add this struct to hold the token response
type SpotifyTokenResponse struct {
	AccessToken    string `json:"access_token"`
	TokenType      string `json:"token_type"`
	ExpiresIn      int    `json:"expires_in"`
	RefreshToken   string `json:"refresh_token"`
	Scope          string `json:"scope"`
}

// Endpoint handlers for root /
func handler(w http.ResponseWriter, r *http.Request) {
	// fmt.Println("Running handler func")
	// fmt.Fprintf(w, "Hello, world!")
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

	// Redirect to the data endpoint with the access token
	if tokenResponse.AccessToken != "" {
		route := fmt.Sprintf("http://localhost:3000/data?access_token=%s", tokenResponse.AccessToken)
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
	accessToken := r.URL.Query().Get("access_token")
	if accessToken == "" {
		http.Error(w, "No access token provided", http.StatusBadRequest)
		return
	}

	fmt.Println(fmt.Sprintf("Access token: %s", accessToken))

	// Use the new GetUserProfile helper
	userProfileBody, err := GetUserProfile(accessToken)
	if err != nil {
		log.Printf("Error getting user profile: %v", err)
		http.Error(w, "Failed to fetch user data", http.StatusInternalServerError)
		return
	}

	// Pull the user id from the user profile
	var userProfile map[string]interface{}
	if err := json.Unmarshal(userProfileBody, &userProfile); err != nil {
		log.Printf("Error unmarshalling user profile: %v", err)
		http.Error(w, "Failed to parse user profile", http.StatusInternalServerError)
		return
	}
	fmt.Printf("\nFull user profile map: %+v\n", userProfile)

	userID := userProfile["id"].(string)
	fmt.Printf("\nUser ID: %s\n", userID)
	body, err := GetUserPlaylists(accessToken, userID)
	if err != nil {
		log.Printf("Error getting user playlists: %v", err)
		http.Error(w, "Failed to fetch user playlists", http.StatusInternalServerError)
		return
	}

	// Format the JSON response and log to console
	// var prettyJSON bytes.Buffer
	// if err := json.Indent(&prettyJSON, body, "", "    "); err != nil {
	// 	log.Printf("Error formatting JSON: %v", err)
	// }
	// fmt.Printf("\nUser profile:\n%s\n", prettyJSON.String())

	// Set content type header to application/json
	w.Header().Set("Content-Type", "application/json")

	// Write the JSON response directly to the ResponseWriter
	w.Write(body)

	elapsed := time.Since(start)
	fmt.Printf("Data function took %s\n", elapsed)
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	http.HandleFunc("/", handler)
	http.HandleFunc("/login", login)
	http.HandleFunc("/callback", callback)
	http.HandleFunc("/data", data)
	http.ListenAndServe(":3024", nil)
}
