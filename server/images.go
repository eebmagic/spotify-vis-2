package main

import (
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"net/http"
)

// ImageInfo holds basic information about an image
type Color struct {
	R int
	G int
	B int
}

// ProcessImage safely processes an image URL and returns its dimensions
// Returns nil if there's any error processing the image
func ProcessImage(spotifyImage *SpotifyImage) Color {
	if spotifyImage.URL == "" {
		return Color{R: 0, G: 0, B: 0}
	}

	fmt.Println(fmt.Sprintf("Processing image: %s", spotifyImage.URL))

	// Make an HTTP request to get the image
	resp, err := http.Get(spotifyImage.URL)
	if err != nil {
		log.Printf("Error fetching image %s: %v", spotifyImage.URL, err)
		return Color{R: 0, G: 0, B: 0}
	}
	defer resp.Body.Close()

	// Check if the response was successful
	if resp.StatusCode != http.StatusOK {
		log.Printf("Non-200 status code fetching image %s: %d", spotifyImage.URL, resp.StatusCode)
		return Color{R: 0, G: 0, B: 0}
	}

	// Try to decode the image
	img, _, err := image.Decode(resp.Body)
	if err != nil {
		log.Printf("Error decoding image %s: %v", spotifyImage.URL, err)
		return Color{R: 0, G: 0, B: 0}
	}

	// Compute the average color of the image
	avgColor := ComputeAverageColor(img)

	return avgColor
}

func ComputeAverageColor(img image.Image) Color {
	bounds := img.Bounds()
	totalR, totalG, totalB := 0, 0, 0
	count := 0

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			totalR += int(r>>8)
			totalG += int(g>>8)
			totalB += int(b>>8)
			count++
		}
	}

	avgR := totalR / count
	avgG := totalG / count
	avgB := totalB / count

	avgColor := Color{R: avgR, G: avgG, B: avgB}

	return avgColor
}

// FindSmallestImage takes a slice of Spotify image objects and returns the smallest one
func FindSmallestImage(images *[]SpotifyImage) *SpotifyImage {
	if len(*images) == 0 {
		return nil
	}

	// If there's only one image, return it
	if len(*images) == 1 {
		return &(*images)[0]
	}

	// Find the smallest image by area
	smallestImage := (*images)[0]
	smallestArea := 0

	// Calculate the area of the first image
	if (smallestImage.Width != 0) && (smallestImage.Height != 0) {
		smallestArea = smallestImage.Width * smallestImage.Height
	}

	// Compare with other images
	for _, img := range (*images)[1:] {
		if (img.Width != 0) && (img.Height != 0) {
			area := img.Width * img.Height
			if area > 0 && (smallestArea == 0 || area < smallestArea) {
				smallestArea = area
				smallestImage = img
			}
		}
	}

	return &smallestImage
}