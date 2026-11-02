package platform

import (
	"bytes"
	"encoding/xml"
	"os"
	"path/filepath"
)

func Autostart(enabled bool) error {
	home, e := os.UserHomeDir()
	if e != nil {
		return e
	}
	dir := filepath.Join(home, "Library", "LaunchAgents")
	path := filepath.Join(dir, "blog.tidepage.companion.plist")
	if !enabled {
		e = os.Remove(path)
		if os.IsNotExist(e) {
			return nil
		}
		return e
	}
	exe, e := os.Executable()
	if e != nil {
		return e
	}
	var escaped bytes.Buffer
	if e = xml.EscapeText(&escaped, []byte(exe)); e != nil {
		return e
	}
	content := `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>blog.tidepage.companion</string><key>ProgramArguments</key><array><string>` + escaped.String() + `</string><string>--background</string></array><key>RunAtLoad</key><true/></dict></plist>`
	if e = os.MkdirAll(dir, 0700); e != nil {
		return e
	}
	return os.WriteFile(path, []byte(content), 0600)
}
