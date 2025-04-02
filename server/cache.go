package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheEntry struct {
	AvgColor    Color `json:"avg_color"`
	CommonColor Color `json:"common_color"`
}

func GetCache(key string) (Color, Color, error) {
	// Try to get from Redis
	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return Color{}, Color{}, fmt.Errorf("key not found")
	} else if err != nil {
		return Color{}, Color{}, err
	}

	// Unmarshal the cached entry
	var entry CacheEntry
	if err := json.Unmarshal([]byte(val), &entry); err != nil {
		return Color{}, Color{}, err
	}

	return entry.AvgColor, entry.CommonColor, nil
}

func SetCache(key string, avgColor Color, commonColor Color) error {
	// Create cache entry
	entry := CacheEntry{
		AvgColor:    avgColor,
		CommonColor: commonColor,
	}

	// Marshal the entry
	jsonData, err := json.Marshal(entry)
	if err != nil {
		return err
	}

	// Set in Redis with 24 hour expiration
	err = rdb.Set(ctx, key, jsonData, 24*time.Hour).Err()
	if err != nil {
		return err
	}

	return nil
}

