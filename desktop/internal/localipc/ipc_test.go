package localipc

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"tidepage.local/companion/internal/companion"
	"time"
)

func TestLocalHostRequiresSecretAndRejectsBrowserOrigin(t *testing.T) {
	c := companion.New(nil)
	defer c.Close()
	dir := t.TempDir()
	host, e := Serve(dir, c, func() {})
	if e != nil {
		t.Fatal(e)
	}
	defer host.Close()
	data, _ := os.ReadFile(filepath.Join(dir, "runtime.json"))
	var a address
	_ = json.Unmarshal(data, &a)
	for _, origin := range []string{"", "https://untrusted.example"} {
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		req, _ := http.NewRequestWithContext(ctx, "GET", a.URL+"/state", nil)
		if origin != "" {
			req.Header.Set("Authorization", "Bearer "+a.Secret)
			req.Header.Set("Origin", origin)
		}
		response, e := http.DefaultClient.Do(req)
		cancel()
		if e != nil {
			t.Fatal(e)
		}
		response.Body.Close()
		if response.StatusCode != 401 {
			t.Fatal("unauthorized IPC accepted")
		}
	}
	remote, e := Connect(dir, nil)
	if e != nil {
		t.Fatal(e)
	}
	defer remote.Close()
	remote.Pause(true)
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		_ = remote.refresh()
		if remote.Snapshot().Paused {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("pause command not applied")
}
func TestRuntimeFileCannotRedirectCredentials(t *testing.T) {
	dir := t.TempDir()
	for _, url := range []string{"", "x", "https://example.com", "http://127.0.0.1.evil:80"} {
		data, _ := json.Marshal(address{URL: url, Secret: "secret"})
		_ = os.WriteFile(filepath.Join(dir, "runtime.json"), data, 0600)
		if _, e := Connect(dir, nil); e == nil {
			t.Fatal("untrusted endpoint accepted")
		}
	}
}
