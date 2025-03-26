package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
)

const (
	SPOTIFY_API_BASE = "https://api.spotify.com/v1"
)

// GetUserProfile fetches the current user's Spotify profile
func GetUserProfile(accessToken string) ([]byte, error) {
	// Create request to Spotify API
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/me", SPOTIFY_API_BASE), nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	// Add authorization header
	req.Header.Add("Authorization", "Bearer "+accessToken)

	// Make the request
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request to Spotify API: %v", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Spotify API returned non-200 status: %d", resp.StatusCode)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}

	return body, nil
}

// GetUserPlaylists fetches the playlists for a given user
func GetUserPlaylists(accessToken string, userID string) ([]byte, error) {
	// Create request to Spotify API
	endpoint := fmt.Sprintf("%s/users/%s/playlists", SPOTIFY_API_BASE, userID)
	req, err := http.NewRequest("GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	// Add authorization header
	req.Header.Add("Authorization", "Bearer "+accessToken)

	// Make the request
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error making request to Spotify API: %v", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Spotify API returned non-200 status: %d", resp.StatusCode)
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error reading response body: %v", err)
	}

	return body, nil
}

// RefreshAccessToken refreshes an access token using a refresh token
func RefreshAccessToken(refreshToken string) (SpotifyTokenResponse, error) {
	tokenUrl := "https://accounts.spotify.com/api/token"

	// Prepare the form data
	formData := url.Values{}
	formData.Set("grant_type", "refresh_token")
	formData.Set("refresh_token", refreshToken)

	// Create the request
	req, err := http.NewRequest("POST", tokenUrl, strings.NewReader(formData.Encode()))
	if err != nil {
		return SpotifyTokenResponse{}, fmt.Errorf("error creating request: %v", err)
	}

	// Set headers
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	authString := fmt.Sprintf("%s:%s", os.Getenv("SPOTIFY_CLIENT_ID"), os.Getenv("SPOTIFY_CLIENT_SECRET"))
	encodedAuth := base64.StdEncoding.EncodeToString([]byte(authString))
	req.Header.Set("Authorization", fmt.Sprintf("Basic %s", encodedAuth))

	// Make the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return SpotifyTokenResponse{}, fmt.Errorf("error making request: %v", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return SpotifyTokenResponse{}, fmt.Errorf("Spotify API returned non-200 status: %d, body: %s", resp.StatusCode, string(respBody))
	}

	// Parse the response
	var tokenResponse SpotifyTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		return SpotifyTokenResponse{}, fmt.Errorf("error decoding response: %v", err)
	}

	return tokenResponse, nil
}
