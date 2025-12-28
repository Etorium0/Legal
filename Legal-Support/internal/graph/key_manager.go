package graph

import (
	"sync"
)

// KeyManager handles API key rotation for load balancing and quota management.
type KeyManager struct {
	keys []string
	idx  int
	mu   sync.Mutex
}

// NewKeyManager creates a new KeyManager with the provided keys.
func NewKeyManager(keys []string) *KeyManager {
	return &KeyManager{
		keys: keys,
		idx:  0,
	}
}

// GetNextKey returns the next API key in the rotation.
// It is thread-safe.
func (m *KeyManager) GetNextKey() string {
	m.mu.Lock()
	defer m.mu.Unlock()

	if len(m.keys) == 0 {
		return ""
	}

	key := m.keys[m.idx]
	m.idx = (m.idx + 1) % len(m.keys)
	return key
}

// Count returns the number of keys managed.
func (m *KeyManager) Count() int {
	return len(m.keys)
}
