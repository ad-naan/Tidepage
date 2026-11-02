package collector

import (
	"context"
	"errors"
	"howett.net/plist"
	"image"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func processIcon(ctx context.Context, p Process) (image.Image, error) {
	index := strings.Index(p.Path, ".app/")
	if index < 0 {
		return nil, errors.New("no app bundle")
	}
	bundle := p.Path[:index+4]
	info, e := os.Open(filepath.Join(bundle, "Contents", "Info.plist"))
	if e != nil {
		return nil, e
	}
	defer info.Close()
	var properties struct {
		Icon string `plist:"CFBundleIconFile"`
	}
	if e = plist.NewDecoder(info).Decode(&properties); e != nil {
		return nil, e
	}
	icon := properties.Icon
	if icon == "" {
		return nil, errors.New("no bundle icon")
	}
	if filepath.Ext(icon) == "" {
		icon += ".icns"
	}
	if filepath.Base(icon) != icon {
		return nil, errors.New("invalid icon name")
	}
	source := filepath.Join(bundle, "Contents", "Resources", icon)
	if filepath.Ext(source) == ".png" {
		return readImage(source)
	}
	temp, e := os.CreateTemp("", "tidepage-icon-*.png")
	if e != nil {
		return nil, e
	}
	path := temp.Name()
	temp.Close()
	defer os.Remove(path)
	// One conversion per cached application, never on each polling tick.
	if e = exec.CommandContext(ctx, "/usr/bin/sips", "-s", "format", "png", source, "--out", path).Run(); e != nil {
		return nil, e
	}
	return readImage(path)
}
