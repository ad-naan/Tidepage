package platform

import (
	"os"
	"path/filepath"
	"strings"
)

func Autostart(enabled bool) error {
	base, e := os.UserConfigDir()
	if e != nil {
		return e
	}
	dir := filepath.Join(base, "autostart")
	path := filepath.Join(dir, "tidepage-companion.desktop")
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
	exe = strings.NewReplacer(`\`, `\\`, `"`, `\"`, "`", "\\`", "$", `\$`, "%", "%%").Replace(exe)
	if e = os.MkdirAll(dir, 0700); e != nil {
		return e
	}
	return os.WriteFile(path, []byte("[Desktop Entry]\nType=Application\nName=Tidepage Companion\nExec=\""+exe+"\" --background\nTerminal=false\nX-GNOME-Autostart-enabled=true\n"), 0600)
}
