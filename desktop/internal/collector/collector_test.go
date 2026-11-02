package collector

import (
	"bytes"
	"context"
	"encoding/base64"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"tidepage.local/companion/internal/config"
	"time"
)

func TestMatchingIsExact(t *testing.T) {
	if Matches("Code", "CodeHelper", "") {
		t.Fatal("substring matched")
	}
	if !Matches("Code.exe", "Code.exe", "") {
		t.Fatal("exact name missed")
	}
	if !Matches(filepath.Join("apps", "editor"), "editor", filepath.Join("apps", "editor")) {
		t.Fatal("exact path missed")
	}
}
func TestPNGIsSmallAndSanitized(t *testing.T) {
	value, e := PNGData(image.NewNRGBA(image.Rect(0, 0, 1024, 1024)))
	if e != nil {
		t.Fatal(e)
	}
	raw, e := base64.StdEncoding.DecodeString(strings.TrimPrefix(value, "data:image/png;base64,"))
	if e != nil || len(value) > 24000 {
		t.Fatal("invalid payload")
	}
	img, e := png.Decode(bytes.NewReader(raw))
	if e != nil || img.Bounds().Dx() != 48 || img.Bounds().Dy() != 48 {
		t.Fatal("icon not normalized")
	}
}
func TestPauseNeverCollects(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	c := New()
	result := c.Sample(ctx, config.Default(), true)
	if result.Presence.Status != "paused" || len(result.Presence.Apps) != 0 || result.Presence.Track != nil || result.Warning != "" {
		t.Fatal("paused state must be empty without collecting")
	}
}
func TestNativeProcessAndIcon(t *testing.T) {
	if testing.Short() {
		t.Skip("native process smoke test")
	}
	path, e := os.Executable()
	if e != nil {
		t.Fatal(e)
	}
	cfg := config.Default()
	cfg.Music = false
	cfg.Rules = []config.Rule{{ID: "self", Name: "Native test", Process: filepath.Base(path), Enabled: true}}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	result := New().Sample(ctx, cfg, false)
	if len(result.Presence.Apps) != 1 {
		t.Fatal("running process was not found")
	}
	if result.Presence.Apps[0].Name != "Native test" {
		t.Fatal("private process name replaced public name")
	}
}
