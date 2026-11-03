package collector

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"github.com/shirou/gopsutil/v4/process"
	"golang.org/x/image/draw"
	"image"
	_ "image/jpeg"
	"image/png"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/protocol"
)

type Process struct{ Name, Path string }
type Result struct {
	Presence protocol.Presence
	Warning  string
}
type Collector struct {
	icons       map[string]string
	activeAppID string
}

func stringLimit(s string, n int) string {
	r := []rune(s)
	if len(r) > n {
		r = r[:n]
	}
	return string(r)
}
func New() *Collector { return &Collector{icons: map[string]string{}} }
func Matches(rule, name, path string) bool {
	if runtime.GOOS == "windows" {
		rule = strings.ToLower(rule)
		name = strings.ToLower(name)
		path = strings.ToLower(path)
	}
	if rule == name {
		return true
	}
	if path == "" {
		return false
	}
	if filepath.Clean(rule) == filepath.Clean(path) {
		return true
	}
	return runtime.GOOS == "darwin" && strings.HasSuffix(rule, ".app") && strings.HasPrefix(path, filepath.Clean(rule)+string(os.PathSeparator))
}
func Running(ctx context.Context) ([]Process, error) {
	ps, e := process.ProcessesWithContext(ctx)
	if e != nil {
		return nil, e
	}
	out := []Process{}
	seen := map[string]bool{}
	for _, p := range ps {
		if ctx.Err() != nil {
			return out, ctx.Err()
		}
		n, e := p.NameWithContext(ctx)
		if e != nil || n == "" || seen[n] {
			continue
		}
		path, _ := p.ExeWithContext(ctx)
		seen[n] = true
		out = append(out, Process{n, path})
	}
	sort.Slice(out, func(i, j int) bool { return strings.ToLower(out[i].Name) < strings.ToLower(out[j].Name) })
	return out, nil
}
func (c *Collector) Sample(ctx context.Context, cfg config.Config, paused bool) Result {
	result := Result{Presence: protocol.Empty(paused)}
	if paused {
		c.activeAppID = ""
		return result
	}
	enabled := false
	for _, r := range cfg.Rules {
		enabled = enabled || r.Enabled
	}
	if enabled {
		focusedPID := foregroundProcessID(ctx)
		focusedAppID := ""
		ps, e := process.ProcessesWithContext(ctx)
		if e != nil {
			result.Warning = "processError"
		} else {
			matched := make(map[string]Process)
			for _, p := range ps {
				if ctx.Err() != nil {
					break
				}
				name, e := p.NameWithContext(ctx)
				if e != nil {
					continue
				}
				var path string
				needPath := false
				for _, r := range cfg.Rules {
					if r.Enabled && (strings.ContainsAny(r.Process, "/\\") || Matches(r.Process, name, "")) {
						needPath = true
						break
					}
				}
				if needPath {
					path, _ = p.ExeWithContext(ctx)
				}
				for _, r := range cfg.Rules {
					if r.Enabled && Matches(r.Process, name, path) {
						if p.Pid == focusedPID {
							focusedAppID = r.ID
						}
						if _, exists := matched[r.ID]; !exists {
							matched[r.ID] = Process{name, path}
						}
					}
				}
			}
			for _, r := range cfg.Rules {
				if p, ok := matched[r.ID]; ok {
					a := protocol.App{ID: r.ID, Name: r.Name}
					if cfg.Icons {
						a.Icon = c.icon(ctx, r.Icon, p)
					}
					result.Presence.Apps = append(result.Presence.Apps, a)
				}
			}
		}
		c.prioritizeApp(result.Presence.Apps, focusedAppID)
	}
	if cfg.Music {
		track, e := nowPlaying(ctx)
		if e != nil {
			result.Warning = "mediaError"
		} else {
			result.Presence.Track = track
		}
	}
	return result
}

// The first public app drives the website icon. Keep the rest in rule order.
// A non-shared foreground process never replaces a shared app or leaves the device.
func (c *Collector) prioritizeApp(apps []protocol.App, focusedID string) {
	selected := -1
	for i, app := range apps {
		if app.ID == focusedID {
			selected = i
			break
		}
		if app.ID == c.activeAppID {
			selected = i
		}
	}
	if len(apps) == 0 {
		c.activeAppID = ""
		return
	}
	if selected < 0 {
		selected = 0
	}
	active := apps[selected]
	copy(apps[1:selected+1], apps[:selected])
	apps[0] = active
	c.activeAppID = active.ID
}
func (c *Collector) icon(ctx context.Context, custom string, p Process) string {
	key := custom
	if key == "" {
		key = p.Path
	}
	if key == "" {
		key = p.Name
	}
	if v, ok := c.icons[key]; ok {
		return v
	}
	if len(c.icons) >= 64 {
		clear(c.icons)
	}
	var img image.Image
	var e error
	if custom != "" {
		img, e = readImage(custom)
	} else {
		img, e = processIcon(ctx, p)
	}
	value := ""
	if e == nil && img != nil {
		value, _ = PNGData(img)
	}
	c.icons[key] = value
	return value
}
func readImage(path string) (image.Image, error) {
	f, e := os.Open(path)
	if e != nil {
		return nil, e
	}
	defer f.Close()
	data, e := io.ReadAll(io.LimitReader(f, 4*1024*1024+1))
	if e != nil || len(data) > 4*1024*1024 {
		return nil, errors.New("image too large")
	}
	info, _, e := image.DecodeConfig(bytes.NewReader(data))
	if e != nil || info.Width > 4096 || info.Height > 4096 || info.Width < 1 || info.Height < 1 {
		return nil, errors.New("invalid image")
	}
	img, _, e := image.Decode(bytes.NewReader(data))
	return img, e
}
func PNGData(img image.Image) (string, error) {
	out := image.NewNRGBA(image.Rect(0, 0, 48, 48))
	draw.CatmullRom.Scale(out, out.Bounds(), img, img.Bounds(), draw.Over, nil)
	var b bytes.Buffer
	if e := png.Encode(&b, out); e != nil {
		return "", e
	}
	if b.Len() > 17000 {
		return "", errors.New("icon too large")
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(b.Bytes()), nil
}

// ResolveIcon supports immediate rule-editor previews without starting collection.
func ResolveIcon(ctx context.Context, custom string, p Process) (string, error) {
	var img image.Image
	var e error
	if custom != "" {
		img, e = readImage(custom)
	} else {
		img, e = processIcon(ctx, p)
	}
	if e != nil {
		return "", e
	}
	return PNGData(img)
}
