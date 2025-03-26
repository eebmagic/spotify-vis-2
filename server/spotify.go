package main

import (
	"fmt"
	"io"
	"net/http"
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
