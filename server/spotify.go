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

// Image represents a Spotify album image with dimensions
type SpotifyImage struct {
	URL    string `json:"url"`
	Height int    `json:"height"`
	Width  int    `json:"width"`
}
// TrackItem represents a track item in a Spotify playlist
type TrackItem struct {
	Track struct {
		ID string `json:"id"`
		Name string `json:"name"`
		Album struct {
			Images []SpotifyImage `json:"images"`
		} `json:"album"`
	} `json:"track"`
}
type ProcessedItem struct {
	Track json.RawMessage `json:"track"`
	AvgColor Color `json:"avgColor"`
	CommonColor Color `json:"commonColor"`
}

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

// GetCurrentUserPlaylists fetches the playlists for the current user
func GetCurrentUserPlaylists(accessToken string) ([]byte, error) {
	// Create request to Spotify API
	endpoint := fmt.Sprintf("%s/me/playlists", SPOTIFY_API_BASE)
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

// PaginatedResponse is a generic structure for Spotify's paginated responses
type PaginatedResponse struct {
	Next  string          `json:"next"`
	Items json.RawMessage `json:"items"`
	Total int             `json:"total"`
}

// GetPlaylistTracks fetches all tracks for a specific playlist, handling pagination
func GetPlaylistTracks(playlistId string, accessToken string) ([]byte, error) {
	// Define our track collection that will hold all tracks
	type CombinedTracksResponse struct {
		Items []json.RawMessage `json:"items"`
		Total int               `json:"total"`
	}

	var allTracks CombinedTracksResponse

	// Start with the base endpoint
	nextURL := fmt.Sprintf("%s/playlists/%s/tracks", SPOTIFY_API_BASE, playlistId)

	// Loop until we have no more pages to fetch
	for nextURL != "" {
		// Create request to Spotify API
		req, err := http.NewRequest("GET", nextURL, nil)
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

		// Check response status
		if resp.StatusCode != http.StatusOK {
			resp.Body.Close()
			return nil, fmt.Errorf("Spotify API returned non-200 status: %d", resp.StatusCode)
		}

		// Read response body
		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("error reading response body: %v", err)
		}

		// Parse the paginated response
		var pageResponse PaginatedResponse
		if err := json.Unmarshal(body, &pageResponse); err != nil {
			return nil, fmt.Errorf("error parsing response JSON: %v", err)
		}

		// Set the total count on first page
		if allTracks.Total == 0 {
			allTracks.Total = pageResponse.Total
		}

		// Parse the items from this page
		var items []json.RawMessage
		if err := json.Unmarshal(pageResponse.Items, &items); err != nil {
			// If items is not an array, it might be a single item
			items = []json.RawMessage{pageResponse.Items}
		}

		// Add these items to our collection
		allTracks.Items = append(allTracks.Items, items...)

		// Update the URL for the next page, or set to empty string to end the loop
		nextURL = pageResponse.Next

		fmt.Printf("Fetched playlist tracks page, items: %d, next URL: %s\n", len(items), nextURL)
	}

	fmt.Printf("Total tracks collected: %d\n", len(allTracks.Items))

	// Parse all tracks into TrackItem structs
	trackItems := []TrackItem{}
	for _, item := range allTracks.Items {
		var trackItem TrackItem
		if err := json.Unmarshal(item, &trackItem); err != nil {
			return nil, fmt.Errorf("error parsing track item: %v", err)
		}
		trackItems = append(trackItems, trackItem)
	}

	// Process the images
	processedItems := HandoffItemsForImageProcessing(allTracks.Items)

	// Marshal the combined tracks back to JSON
	result, err := json.Marshal(processedItems)
	if err != nil {
		return nil, fmt.Errorf("error marshaling processed track list: %v", err)
	}

	return result, nil
}

func HandoffItemsForImageProcessing(items []json.RawMessage) []ProcessedItem {
	processedItems := []ProcessedItem{}
	for _, item := range items {
		var trackItem TrackItem
		if err := json.Unmarshal(item, &trackItem); err != nil {
			fmt.Printf("error parsing track item: %v", err)
		}
		smallestImage := FindSmallestImage(&trackItem.Track.Album.Images)
		avgColor, commonColor := ProcessImage(smallestImage)
		fmt.Printf("Processed image - URL: %s, Avg Color: %+v, Common Color: %+v\n", smallestImage.URL, avgColor, commonColor)

		// Pull out only the track object from the item
		// TODO: Come back later and thin this down to only the fields we need
		var trackJson json.RawMessage
		if err := json.Unmarshal(item, &struct {
			Track *json.RawMessage `json:"track"`
		}{&trackJson}); err != nil {
			fmt.Printf("error extracting track from item: %v", err)
			trackJson = item // Fallback to using full item if extraction fails
		}

		processedItems = append(processedItems, ProcessedItem{Track: trackJson, AvgColor: avgColor, CommonColor: commonColor})
	}
	return processedItems
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
