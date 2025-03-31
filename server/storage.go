package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"go.etcd.io/bbolt"
)

const (
	// BucketName is the name of the bucket to store sessions
	SessionBucket = "sessions"
	// DBPath is the path to the bbolt database file
	DBPath = "sessions.db"
	// SessionExpiry is the default session expiry time
	SessionExpiry = 24 * time.Hour
)

// Session represents a user session
type Session struct {
	ID        string               `json:"id"`
	Token     SpotifyTokenResponse `json:"token"`
	ExpiresAt time.Time            `json:"expires_at"`
}

// InitDB initializes the database
func InitDB() (*bbolt.DB, error) {
	db, err := bbolt.Open(DBPath, 0600, &bbolt.Options{Timeout: 1 * time.Second})
	if err != nil {
		return nil, fmt.Errorf("could not open db: %v", err)
	}

	// Create the sessions bucket if it doesn't exist
	err = db.Update(func(tx *bbolt.Tx) error {
		_, err := tx.CreateBucketIfNotExists([]byte(SessionBucket))
		if err != nil {
			return fmt.Errorf("could not create bucket: %v", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return db, nil
}

// GenerateSessionID generates a random session ID
func GenerateSessionID() (string, error) {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}

// StoreSession stores a session in the database
func StoreSession(db *bbolt.DB, tokenResponse SpotifyTokenResponse) (string, error) {
	sessionID, err := GenerateSessionID()
	if err != nil {
		return "", fmt.Errorf("could not generate session ID: %v", err)
	}

	expiresAt := time.Now().Add(time.Duration(tokenResponse.ExpiresIn) * time.Second)
	session := Session{
		ID:        sessionID,
		Token:     tokenResponse,
		ExpiresAt: expiresAt,
	}

	// Serialize the session to JSON
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return "", fmt.Errorf("could not marshal session: %v", err)
	}

	// Store the session in the database
	err = db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(SessionBucket))
		return b.Put([]byte(sessionID), sessionJSON)
	})
	if err != nil {
		return "", fmt.Errorf("could not store session: %v", err)
	}

	return sessionID, nil
}

// GetSession retrieves a session from the database
func GetSession(db *bbolt.DB, sessionID string) (*Session, error) {
	var session Session

	err := db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(SessionBucket))
		sessionData := b.Get([]byte(sessionID))
		if sessionData == nil {
			return fmt.Errorf("session not found")
		}

		return json.Unmarshal(sessionData, &session)
	})
	if err != nil {
		return nil, err
	}

	// Check if the session has expired
	if time.Now().After(session.ExpiresAt) {
		// If we have a refresh token, try to refresh the session
		if session.Token.RefreshToken != "" {
			refreshedToken, err := RefreshAccessToken(session.Token.RefreshToken)
			if err == nil {
				// Update the session with the new token
				err = UpdateSession(db, sessionID, refreshedToken)
				if err == nil {
					// Get the updated session
					return GetSession(db, sessionID)
				}
			}
		}

		// Delete the expired session if we couldn't refresh it
		_ = db.Update(func(tx *bbolt.Tx) error {
			b := tx.Bucket([]byte(SessionBucket))
			return b.Delete([]byte(sessionID))
		})
		return nil, fmt.Errorf("session expired")
	}

	return &session, nil
}

// UpdateSession updates an existing session with a new token
func UpdateSession(db *bbolt.DB, sessionID string, tokenResponse SpotifyTokenResponse) error {
	// Retrieve the existing session to keep any data we want to preserve
	var session Session
	err := db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(SessionBucket))
		sessionData := b.Get([]byte(sessionID))
		if sessionData == nil {
			return fmt.Errorf("session not found")
		}
		return json.Unmarshal(sessionData, &session)
	})
	if err != nil {
		return err
	}

	// If the new token doesn't have a refresh token but the old one does, keep the old refresh token
	if tokenResponse.RefreshToken == "" && session.Token.RefreshToken != "" {
		tokenResponse.RefreshToken = session.Token.RefreshToken
	}

	// Update the session with the new token
	session.Token = tokenResponse
	session.ExpiresAt = time.Now().Add(time.Duration(tokenResponse.ExpiresIn) * time.Second)

	// Serialize the updated session
	sessionJSON, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("could not marshal session: %v", err)
	}

	// Store the updated session
	return db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(SessionBucket))
		return b.Put([]byte(sessionID), sessionJSON)
	})
}

// DeleteSession removes a session from the database
func DeleteSession(db *bbolt.DB, sessionID string) error {
	return db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(SessionBucket))
		return b.Delete([]byte(sessionID))
	})
}

// CleanupExpiredSessions removes all expired sessions from the database
func CleanupExpiredSessions(db *bbolt.DB) error {
	fmt.Println("Cleaning up expired sessions")
	var expiredSessionIDs []string

	// Find all expired sessions
	err := db.View(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(SessionBucket))
		return b.ForEach(func(k, v []byte) error {
			var session Session
			if err := json.Unmarshal(v, &session); err != nil {
				return nil // Skip invalid sessions
			}

			if time.Now().After(session.ExpiresAt) {
				expiredSessionIDs = append(expiredSessionIDs, session.ID)
			}
			return nil
		})
	})
	if err != nil {
		return err
	}

	// Delete all expired sessions
	return db.Update(func(tx *bbolt.Tx) error {
		b := tx.Bucket([]byte(SessionBucket))
		for _, id := range expiredSessionIDs {
			if err := b.Delete([]byte(id)); err != nil {
				return err
			}
		}
		return nil
	})
}