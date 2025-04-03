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

// ColorToHex converts a Color struct to a hex string representation
func (c Color) ToHex() string {
	return fmt.Sprintf("#%02x%02x%02x", c.R, c.G, c.B)
}

// HexToColor converts a hex string (e.g. "#ff0000") to a Color struct
func HexToColor(hex string) Color {
	// Remove the leading #
	hex = hex[1:]

	var r, g, b uint8
	if len(hex) == 6 {
		fmt.Sscanf(hex, "%02x%02x%02x", &r, &g, &b)
	}

	return Color{
		R: int(r),
		G: int(g),
		B: int(b),
	}
}



// Download the image and then pass along to compute the main color
func ProcessImage(spotifyImage *SpotifyImage) (Color, Color) {
	if spotifyImage.URL == "" {
		return Color{R: 0, G: 0, B: 0}, Color{R: 0, G: 0, B: 0}
	}

	// Make an HTTP request to get the image
	resp, err := http.Get(spotifyImage.URL)
	if err != nil {
		log.Printf("Error fetching image %s: %v", spotifyImage.URL, err)
		return Color{R: 0, G: 0, B: 0}, Color{R: 0, G: 0, B: 0}
	}
	defer resp.Body.Close()

	// Check if the response was successful
	if resp.StatusCode != http.StatusOK {
		log.Printf("Non-200 status code fetching image %s: %d", spotifyImage.URL, resp.StatusCode)
		return Color{R: 0, G: 0, B: 0}, Color{R: 0, G: 0, B: 0}
	}

	// Try to decode the image
	img, _, err := image.Decode(resp.Body)
	if err != nil {
		log.Printf("Error decoding image %s: %v", spotifyImage.URL, err)
		return Color{R: 0, G: 0, B: 0}, Color{R: 0, G: 0, B: 0}
	}

	// Compute the average color of the image
	avgColor, commonColor := ComputeAverageColor(img)

	return avgColor, commonColor
}

func ComputeAverageColor(img image.Image) (Color, Color) {
	bounds := img.Bounds()
	totalR, totalG, totalB := 0, 0, 0
	count := 0
	rbit := 3

	colorCounts := make(map[Color]int)

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			totalR += int(r>>8)
			totalG += int(g>>8)
			totalB += int(b>>8)
			count++

			colorCounts[Color{R: int(r>>8>>rbit<<rbit), G: int(g>>8>>rbit<<rbit), B: int(b>>8>>rbit<<rbit)}]++
		}
	}

	avgR := totalR / count
	avgG := totalG / count
	avgB := totalB / count

	avgColor := Color{R: avgR, G: avgG, B: avgB}

	commonColor := Color{R: 0, G: 0, B: 0}
	commonColorCount := 0
	commonGrayscaleColor := Color{R: 0, G: 0, B: 0}
	commonGrayscaleColorCount := 0

	for color, count := range colorCounts {
		if count > commonColorCount && !isGrayscale(color) {
			commonColor = color
			commonColorCount = count
		}

		if count > commonGrayscaleColorCount && isGrayscale(color) {
			commonGrayscaleColor = color
			commonGrayscaleColorCount = count
		}
	}

	if commonColorCount > 20 {
		return avgColor, commonColor
	}

	return avgColor, commonGrayscaleColor
}

func absDiff(a, b int) int {
	if a > b {
		return a - b
	}
	return b - a
}

func isGrayscale(color Color) bool {
	thresh := 40
	rg := absDiff(color.R, color.G)
	gb := absDiff(color.G, color.B)
	br := absDiff(color.B, color.R)

	value := (rg < thresh && gb < thresh && br < thresh)

	return value
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