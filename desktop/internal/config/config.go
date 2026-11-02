package config

import (
	"encoding/json"
	"errors"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

type Rule struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Process string `json:"process"`
	Icon    string `json:"icon,omitempty"`
	Enabled bool   `json:"enabled"`
}
type Config struct {
	Endpoint  string `json:"endpoint"`
	Locale    string `json:"locale"`
	Music     bool   `json:"music"`
	Icons     bool   `json:"icons"`
	Autostart bool   `json:"autostart"`
	Interval  int    `json:"intervalSeconds"`
	Rules     []Rule `json:"rules"`
}

func Default() Config {
	return Config{Endpoint: "http://localhost:3101", Locale: "zh-CN", Music: true, Icons: true, Interval: 5, Rules: []Rule{}}
}
func Dir() (string, error) {
	base, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "TidepageCompanion"), nil
}
func Load(dir string) (Config, error) {
	c := Default()
	data, err := os.ReadFile(filepath.Join(dir, "settings.json"))
	if errors.Is(err, os.ErrNotExist) {
		return c, nil
	}
	if err != nil {
		return c, err
	}
	if err = json.Unmarshal(data, &c); err != nil {
		return Default(), err
	}
	if err = c.Validate(); err != nil {
		return Default(), err
	}
	return c, nil
}
func (c Config) Validate() error {
	if !ValidEndpoint(c.Endpoint) {
		return errors.New("invalidEndpoint")
	}
	if c.Locale != "zh-CN" && c.Locale != "en" {
		return errors.New("invalidSettings")
	}
	if c.Interval < 5 || c.Interval > 60 || len(c.Rules) > 12 {
		return errors.New("invalidSettings")
	}
	seen := map[string]bool{}
	for _, r := range c.Rules {
		if len(r.ID) == 0 || len(r.ID) > 80 || seen[r.ID] || len([]rune(r.Name)) == 0 || len([]rune(r.Name)) > 80 || strings.TrimSpace(r.Process) == "" || len(r.Process) > 4096 {
			return errors.New("invalidRule")
		}
		seen[r.ID] = true
	}
	return nil
}
func ValidEndpoint(raw string) bool {
	u, e := url.Parse(raw)
	if e != nil || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return false
	}
	local := u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1" || u.Hostname() == "::1"
	return u.Scheme == "https" || (u.Scheme == "http" && local)
}
func (c Config) Save(dir string) error {
	if e := c.Validate(); e != nil {
		return e
	}
	if e := os.MkdirAll(dir, 0700); e != nil {
		return e
	}
	data, e := json.MarshalIndent(c, "", "  ")
	if e != nil {
		return e
	}
	f, e := os.CreateTemp(dir, "settings-*.tmp")
	if e != nil {
		return e
	}
	name := f.Name()
	defer os.Remove(name)
	if e = f.Chmod(0600); e != nil {
		f.Close()
		return e
	}
	if _, e = f.Write(data); e != nil {
		f.Close()
		return e
	}
	if e = f.Sync(); e != nil {
		f.Close()
		return e
	}
	if e = f.Close(); e != nil {
		return e
	}
	return replaceFile(name, filepath.Join(dir, "settings.json"))
}
