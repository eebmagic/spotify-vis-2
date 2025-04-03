package main

import (
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type CacheEntry struct {
	AvgColor    string `json:"a"` // rgb hex strings
	CommonColor string `json:"c"`
}
type CacheUpdate struct {
	AlbumID string     `json:"album_id"`
	Value   CacheEntry `json:"value"`
}

func GetCache(keys []string) ([]*CacheEntry, error) {
	// Get keys from Redis
	vals, err := rdb.MGet(ctx, keys...).Result()
	if err == redis.Nil {
		return make([]*CacheEntry, len(keys)), nil
	} else if err != nil {
		return nil, err
	}

	// Initialize array of nil pointers
	entries := make([]*CacheEntry, len(keys))
	hitCount := 0

	// Unmarshal the cached entries
	for i, v := range vals {
		// If the key is not found, leave the pointer as nil in the output array
		if v == nil {
			continue
		}

		strVal, ok := v.(string)
		if !ok {
			continue
		}

		// Parse the json string and then set the pointer in the output array
		var entry CacheEntry
		if err := json.Unmarshal([]byte(strVal), &entry); err != nil {
			continue
		}
		entries[i] = &entry
		hitCount++
	}
	fmt.Println("hit count: ", hitCount)

	return entries, nil
}

func SetCache(cacheUpdates []CacheUpdate) error {
	// Skip if there are no updates
	if len(cacheUpdates) == 0 {
		return nil
	}

	// Convert CacheEntry objs to stringified json
	pairs := make([]interface{}, 0, len(cacheUpdates)*2)
	for _, update := range cacheUpdates {
		// Add ablum id to array
		pairs = append(pairs, update.AlbumID)

		// Add json string to array
		jsonData, err := json.Marshal(update.Value)
		if err != nil {
			return err
		}
		pairs = append(pairs, string(jsonData))
	}

	// Set keys in Redis
	err := rdb.MSet(ctx, pairs...).Err()
	if err != nil {
		return err
	}

	return nil
}
