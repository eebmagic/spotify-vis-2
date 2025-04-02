package main

import (
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

type CacheEntry struct {
	AvgColor    Color `json:"avg_color"`
	CommonColor Color `json:"common_color"`
}

func GetCache(keys []string) ([]*CacheEntry, error) {
	// Try to get from Redis
	vals, err := rdb.MGet(ctx, keys...).Result()
	if err == redis.Nil {
		return make([]*CacheEntry, len(keys)), nil
	} else if err != nil {
		return nil, err
	}

	// Initialize slice with nil pointers
	entries := make([]*CacheEntry, len(keys))
	hitCount := 0

	// Unmarshal the cached entries
	for i, v := range vals {
		if v == nil {
			continue
		}
		// Type assert the interface{} to string before converting to []byte
		strVal, ok := v.(string)
		if !ok {
			continue
		}

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

func SetCache(cacheUpdates map[string]CacheEntry) error {
	if len(cacheUpdates) == 0 {
		return nil
	}

	// Create cache entry
	pairs := make([]interface{}, 0, len(cacheUpdates)*2)
	for key, value := range cacheUpdates {
		pairs = append(pairs, key)

		jsonData, err := json.Marshal(value)
		if err != nil {
			return err
		}
		pairs = append(pairs, string(jsonData))
	}

	// Set in Redis with 24 hour expiration
	err := rdb.MSet(ctx, pairs...).Err()
	if err != nil {
		return err
	}

	return nil
}
