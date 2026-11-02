package platform

import (
	"golang.org/x/sys/windows/registry"
	"os"
)

func Autostart(enabled bool) error {
	key, _, e := registry.CreateKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Run`, registry.SET_VALUE)
	if e != nil {
		return e
	}
	defer key.Close()
	if !enabled {
		e = key.DeleteValue("TidepageCompanion")
		if e == registry.ErrNotExist {
			return nil
		}
		return e
	}
	exe, e := os.Executable()
	if e != nil {
		return e
	}
	return key.SetStringValue("TidepageCompanion", `"`+exe+`" --background`)
}
