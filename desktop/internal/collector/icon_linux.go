package collector

import (
	"context"
	"errors"
	"image"
	"os"
	"path/filepath"
	"strings"
)

func processIcon(_ context.Context, p Process) (image.Image, error) {
	home, _ := os.UserHomeDir()
	bases := []string{filepath.Join(home, ".local/share"), "/usr/local/share", "/usr/share"}
	icon := strings.TrimSuffix(p.Name, filepath.Ext(p.Name))
	for _, base := range bases {
		entries, _ := filepath.Glob(filepath.Join(base, "applications", "*.desktop"))
		for _, entry := range entries {
			content, e := os.ReadFile(entry)
			if e != nil || len(content) > 100000 {
				continue
			}
			execMatch := false
			candidate := ""
			for _, line := range strings.Split(string(content), "\n") {
				if strings.HasPrefix(line, "Exec=") {
					fields := strings.Fields(strings.TrimPrefix(line, "Exec="))
					if len(fields) > 0 {
						execMatch = filepath.Base(strings.Trim(fields[0], "\"")) == p.Name
					}
				}
				if strings.HasPrefix(line, "Icon=") {
					candidate = strings.TrimSpace(strings.TrimPrefix(line, "Icon="))
				}
			}
			if execMatch && candidate != "" {
				icon = candidate
				break
			}
		}
	}
	if filepath.IsAbs(icon) {
		return readImage(icon)
	}
	for _, base := range bases {
		for _, theme := range []string{"hicolor", "Adwaita", "Papirus"} {
			for _, size := range []string{"48x48", "64x64", "32x32", "128x128", "256x256"} {
				img, e := readImage(filepath.Join(base, "icons", theme, size, "apps", icon+".png"))
				if e == nil {
					return img, nil
				}
			}
		}
		if img, e := readImage(filepath.Join(base, "pixmaps", icon+".png")); e == nil {
			return img, nil
		}
	}
	return nil, errors.New("no PNG icon")
}
