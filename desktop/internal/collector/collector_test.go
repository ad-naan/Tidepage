package collector

import (
	"bytes"
	"context"
	"encoding/base64"
	"github.com/shirou/gopsutil/v4/process"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/protocol"
	"time"
)

func TestNativeForegroundAppPrioritized(t *testing.T) {
	if os.Getenv("TIDEPAGE_NATIVE_TESTS") != "1" {
		t.Skip("requires an interactive desktop")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	pid := foregroundProcessID(ctx)
	if pid <= 0 {
		t.Skip("no foreground process is available in this session")
	}
	foreground, err := process.NewProcessWithContext(ctx, pid)
	if err != nil {
		t.Fatal(err)
	}
	name, err := foreground.NameWithContext(ctx)
	if err != nil {
		t.Fatal(err)
	}
	self, err := os.Executable()
	if err != nil {
		t.Fatal(err)
	}
	if Matches(name, filepath.Base(self), self) {
		t.Skip("test process is itself foreground")
	}
	cfg := config.Default()
	cfg.Music, cfg.Icons = false, false
	cfg.Rules = []config.Rule{
		{ID: "self", Name: "Background test", Process: filepath.Base(self), Enabled: true},
		{ID: "foreground", Name: "Foreground test", Process: name, Enabled: true},
	}
	result := New().Sample(ctx, cfg, false)
	if foregroundProcessID(ctx) != pid {
		t.Skip("foreground changed during sampling")
	}
	if len(result.Presence.Apps) != 2 || result.Presence.Apps[0].ID != "foreground" {
		t.Fatal("foreground allowlisted process was not prioritized")
	}
}

func TestForegroundAppSelection(t *testing.T) {
	c := New()
	apps := func(ids ...string) []protocol.App {
		result := []protocol.App{}
		for _, id := range ids {
			result = append(result, protocol.App{ID: id, Name: id})
		}
		return result
	}
	for _, step := range []struct {
		running           []protocol.App
		focused, expected string
	}{
		{apps("editor", "chat", "music"), "chat", "chat"},
		{apps("editor", "chat", "music"), "editor", "editor"},
		{apps("editor", "chat", "music"), "music", "music"},
		{apps("editor", "chat", "music"), "unmonitored", "music"},
		{apps("editor", "chat"), "", "editor"},
		{apps("chat"), "unmonitored", "chat"},
		{apps(), "chat", ""},
		{apps("editor", "chat"), "", "editor"},
	} {
		before := append([]protocol.App{}, step.running...)
		c.prioritizeApp(step.running, step.focused)
		if c.activeAppID != step.expected {
			t.Fatalf("focused %q: selected %q, want %q", step.focused, c.activeAppID, step.expected)
		}
		if len(step.running) > 0 && step.running[0].ID != step.expected {
			t.Fatal("selected application is not first")
		}
		remaining := []string{}
		for _, app := range step.running {
			if app.ID != step.expected {
				remaining = append(remaining, app.ID)
			}
		}
		original := []string{}
		for _, app := range before {
			if app.ID != step.expected {
				original = append(original, app.ID)
			}
		}
		if strings.Join(remaining, ",") != strings.Join(original, ",") {
			t.Fatal("other applications changed order")
		}
	}
}

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
