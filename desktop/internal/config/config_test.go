package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestEndpointPrivacy(t *testing.T) {
	for _, value := range []string{"https://example.com", "http://localhost:3101", "http://127.0.0.1:3101", "http://[::1]:3101"} {
		if !ValidEndpoint(value) {
			t.Errorf("valid origin rejected: %s", value)
		}
	}
	for _, value := range []string{"http://example.com", "https://user:password@example.com", "https://example.com/?token=secret", "file:///tmp/app", "https://example.com/socket.io", "https://example.com/#secret"} {
		if ValidEndpoint(value) {
			t.Errorf("unsafe origin accepted: %s", value)
		}
	}
}
func TestSettingsRoundTripAndReplace(t *testing.T) {
	dir := t.TempDir()
	c := Default()
	c.Rules = []Rule{{ID: "editor", Name: "编辑器", Process: "Code.exe", Enabled: true}}
	if e := c.Save(dir); e != nil {
		t.Fatal(e)
	}
	c.Music = false
	if e := c.Save(dir); e != nil {
		t.Fatal(e)
	}
	loaded, e := Load(dir)
	if e != nil || loaded.Music || loaded.Rules[0].Name != "编辑器" {
		t.Fatalf("round trip failed: %v", e)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "settings.json"))
	if string(data) == "" {
		t.Fatal("empty settings")
	}
}
func TestCorruptSettingsArePreserved(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "settings.json")
	_ = os.WriteFile(path, []byte("broken"), 0600)
	_, e := Load(dir)
	if e == nil {
		t.Fatal("corrupt data accepted")
	}
	data, _ := os.ReadFile(path)
	if string(data) != "broken" {
		t.Fatal("original overwritten")
	}
}
func TestRuleBounds(t *testing.T) {
	c := Default()
	c.Rules = []Rule{{ID: "x", Name: "X", Process: "app", Enabled: true}, {ID: "x", Name: "Y", Process: "other", Enabled: true}}
	if c.Validate() == nil {
		t.Fatal("duplicate IDs accepted")
	}
	c.Rules = nil
	c.Interval = 1
	if c.Validate() == nil {
		t.Fatal("busy polling accepted")
	}
}
