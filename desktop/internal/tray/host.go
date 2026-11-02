package tray

import (
	"context"
	"embed"
	"fyne.io/systray"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"runtime/debug"
	"sync"
	"syscall"
	"tidepage.local/companion/internal/companion"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/i18n"
	"tidepage.local/companion/internal/localipc"
	"tidepage.local/companion/internal/platform"
)

//go:embed assets/*
var assets embed.FS

// Run never initializes Fyne, a graphics context, font discovery or a GUI window.
func Run(dir string, cfg config.Config, background bool) error {
	debug.SetMemoryLimit(48 * 1024 * 1024)
	debug.SetGCPercent(50)
	t := i18n.Load(cfg.Locale)
	events := make(chan companion.State, 1)
	controller := companion.New(func(s companion.State) {
		select {
		case events <- s:
		default:
			select {
			case <-events:
			default:
			}
			select {
			case events <- s:
			default:
			}
		}
	})
	defer controller.Close()
	var mu sync.Mutex
	var child *exec.Cmd
	show := func() {
		mu.Lock()
		defer mu.Unlock()
		if child != nil {
			return
		}
		exe, e := os.Executable()
		if e != nil {
			return
		}
		child = exec.Command(exe, "--ui")
		child.Stdout = os.Stdout
		child.Stderr = os.Stderr
		if child.Start() != nil {
			child = nil
			return
		}
		current := child
		go func() {
			_ = current.Wait()
			mu.Lock()
			if child == current {
				child = nil
			}
			mu.Unlock()
		}()
	}
	ipc, e := localipc.Serve(dir, controller, show)
	if e != nil {
		return e
	}
	defer ipc.Close()
	token, _ := platform.LoadToken(cfg.Endpoint)
	controller.Configure(cfg, token)
	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()
	systray.Run(func() {
		path := "assets/tide.png"
		if runtime.GOOS == "windows" {
			path = "assets/tide.ico"
		}
		icon, _ := assets.ReadFile(path)
		systray.SetIcon(icon)
		systray.SetTooltip(t.Text("app"))
		status := systray.AddMenuItem(t.Text("disconnected"), "")
		status.Disable()
		current := systray.AddMenuItem(t.Text("noApps"), "")
		current.Disable()
		systray.AddSeparator()
		open := systray.AddMenuItem(t.Text("open"), "")
		pause := systray.AddMenuItem(t.Text("pause"), "")
		systray.AddSeparator()
		quit := systray.AddMenuItem(t.Text("quit"), "")
		if !background {
			show()
		}
		for {
			select {
			case <-ctx.Done():
				systray.Quit()
				return
			case <-open.ClickedCh:
				show()
			case <-pause.ClickedCh:
				controller.Pause(!controller.Snapshot().Paused)
			case <-quit.ClickedCh:
				systray.Quit()
				return
			case s := <-events:
				status.SetTitle(t.Text(s.Connection))
				title := t.Text("noApps")
				if s.Paused {
					title = t.Text("paused")
					pause.SetTitle(t.Text("resume"))
				} else {
					pause.SetTitle(t.Text("pause"))
					if len(s.Presence.Apps) > 0 {
						title = s.Presence.Apps[0].Name
					}
					if s.Presence.Track != nil {
						title += " · " + s.Presence.Track.Title
					}
				}
				current.SetTitle(title)
			}
		}
	}, func() {
		cancel()
		mu.Lock()
		if child != nil && child.Process != nil {
			_ = child.Process.Kill()
		}
		mu.Unlock()
	})
	return nil
}
