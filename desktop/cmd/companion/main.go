package main

import (
	"flag"
	"fmt"
	"github.com/gofrs/flock"
	"log"
	"os"
	"path/filepath"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/localipc"
	"tidepage.local/companion/internal/tray"
	"tidepage.local/companion/internal/ui"
)

// Native build scripts inject the release version from FyneApp.toml.
var version = "dev"

func main() {
	printVersion := flag.Bool("version", false, "Print version without starting the application")
	background := flag.Bool("background", false, "Start in the system tray")
	preview := flag.Bool("preview", false, "Preview the interface without collection, network or persistence")
	gui := flag.Bool("ui", false, "Open the on-demand configuration window")
	page := flag.String("page", "overview", "Initial preview page: overview, watch, settings")
	flag.Parse()
	if *printVersion {
		fmt.Printf("Tidepage Companion %s\n", version)
		return
	}
	dir, e := config.Dir()
	if e != nil {
		log.Print("configuration directory unavailable")
		return
	}
	cfg := config.Default()
	loadError := false
	var lock *flock.Flock
	if !*preview && !*gui {
		if os.MkdirAll(dir, 0700) != nil {
			log.Print("configuration directory unavailable")
			return
		}
		lock = flock.New(filepath.Join(dir, "companion.lock"))
		ok, e := lock.TryLock()
		if e != nil || !ok {
			if remote, err := localipc.Connect(dir, nil); err == nil {
				_ = remote.Show()
				remote.Close()
			} else {
				log.Print("companion already running or configuration locked")
			}
			return
		}
		defer lock.Close()
	}
	if !*preview {
		cfg, e = config.Load(dir)
		loadError = e != nil
	}
	if *gui || *preview {
		ui.Run(ui.Options{Dir: dir, Preview: *preview, Page: *page, Config: cfg, LoadError: loadError})
		return
	}
	if e = tray.Run(dir, cfg, *background); e != nil {
		log.Print("tray host could not start")
	}
}
