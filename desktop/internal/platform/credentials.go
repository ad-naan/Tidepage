package platform

import (
	"crypto/sha256"
	"encoding/hex"
	"github.com/zalando/go-keyring"
	"strings"
)

const service = "blog.tidepage.companion"

func account(endpoint string) string {
	value := sha256.Sum256([]byte(strings.TrimRight(endpoint, "/")))
	return "author:" + hex.EncodeToString(value[:])
}
func SaveToken(endpoint, token string) error { return keyring.Set(service, account(endpoint), token) }
func LoadToken(endpoint string) (string, error) {
	token, e := keyring.Get(service, account(endpoint))
	if e == keyring.ErrNotFound {
		return "", nil
	}
	return token, e
}
