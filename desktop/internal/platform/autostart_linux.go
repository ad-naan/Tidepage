package platform

import (
	"errors"
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
	if strings.Contains(exe, "=") {
		return errors.New("desktop entry executable paths cannot contain '='")
	}
	// The desktop file reader unescapes the value before parsing Exec quotes.
	exe = strings.NewReplacer(`\`, `\\`, `"`, `\"`, "`", "\\`", "$", `\$`, "%", "%%").Replace(exe)
	exe = strings.NewReplacer(`\`, `\\`, "\n", `\n`, "\r", `\r`, "\t", `\t`).Replace(exe)
	if e = os.MkdirAll(dir, 0700); e != nil {
		return e
	}
	return os.WriteFile(path, []byte("[Desktop Entry]\nType=Application\nName=Tidepage Companion\nExec=\""+exe+"\" --background\nTerminal=false\nX-GNOME-Autostart-enabled=true\n"), 0600)
}
