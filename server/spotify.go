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
	"sync"
	"time"
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
	ID string `json:"id"`
	Name string `json:"name"`
	Album struct {
		ID string `json:"id"`
		Name string `json:"name"`
		URL string `json:"href"`
		Images []SpotifyImage `json:"images"`
	} `json:"album"`
}
type jsonTrackItem struct {
	Track TrackItem `json:"track"`
}
type ProcessedItem struct {
	Track TrackItem `json:"track"`
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
	start := time.Now()

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
		fmt.Printf("  Time to create request: %s\n", time.Since(start))

		// Add authorization header
		req.Header.Add("Authorization", "Bearer "+accessToken)

		// Make the request
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("error making request to Spotify API: %v", err)
		}
		fmt.Printf("  Time to receive request: %s\n", time.Since(start))

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
	fmt.Printf("  Time to collect tracks: %s\n", time.Since(start))

	// Parse all tracks into TrackItem structs
	trackItems := []TrackItem{}
	albumSet := make(map[string]bool)
	for _, item := range allTracks.Items {
		var trackItem jsonTrackItem
		if err := json.Unmarshal(item, &trackItem); err != nil {
			return nil, fmt.Errorf("error parsing track item: %v", err)
		}
		if _, ok := albumSet[trackItem.Track.Album.ID]; !ok {
			trackItems = append(trackItems, trackItem.Track)
			albumSet[trackItem.Track.Album.ID] = true
		}
	}
	fmt.Println("Total unique albums: ", len(albumSet))

	// Process the images
	fmt.Printf("Starting image processing: %s\n", time.Now())
	processedItems := HandoffItemsForImageProcessing(trackItems)
	fmt.Printf("Processed %d tracks\n", len(processedItems))
	fmt.Printf("  Time to process images: %s\n", time.Since(start))

	// Marshal the combined tracks back to JSON
	result, err := json.Marshal(processedItems)
	if err != nil {
		return nil, fmt.Errorf("error marshaling processed track list: %v", err)
	}

	return result, nil
}

func HandoffItemsForImageProcessing(items []TrackItem) []ProcessedItem {
	processedItems := make([]ProcessedItem, len(items))

	// Pull the album ids
	albumIds := make([]string, len(items))
	for i, item := range items {
		albumIds[i] = item.Album.ID
	}

	// Check cache
	cacheHits, err := GetCache(albumIds)
	if err != nil {
		fmt.Println("Error getting cache entries:", err)
	}

	var wg sync.WaitGroup
	wg.Add(len(items))
	cacheUpdates := make(map[string]CacheEntry)
	cachMu := sync.Mutex{}

	for i, item := range items {
		go func(i int, item TrackItem) {
			defer wg.Done()

			var avgColor Color
			var commonColor Color

			// Check cache hits (nil pointer means nothing came back from Redis for the key)
			if cacheHits[i] != nil {
				avgColor = (*cacheHits[i]).AvgColor
				commonColor = (*cacheHits[i]).CommonColor
			} else {
				smallestImage := FindSmallestImage(&item.Album.Images)
				avgColor, commonColor = ProcessImage(smallestImage)

				// Add values to map of cache updates
				cachMu.Lock()
				cacheUpdates[item.Album.ID] = CacheEntry{AvgColor: avgColor, CommonColor: commonColor}
				cachMu.Unlock()
			}

			processedItems[i] = ProcessedItem{Track: item, AvgColor: avgColor, CommonColor: commonColor}
		}(i, item)
	}

	// Wait for all goroutines to finish
	wg.Wait()

	// Apply the map of cache updates
	go SetCache(cacheUpdates)

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
