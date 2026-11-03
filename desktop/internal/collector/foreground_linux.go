package collector

import (
	"context"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

func foregroundProcessID(ctx context.Context) int32 {
	// Wayland intentionally has no global foreground-window API. Keep rule order
	// rather than treating an XWayland window as the native desktop's active app.
	if os.Getenv("XDG_SESSION_TYPE") == "wayland" || os.Getenv("WAYLAND_DISPLAY") != "" || os.Getenv("DISPLAY") == "" {
		return 0
	}
	xprop, err := exec.LookPath("xprop")
	if err != nil {
		return 0
	}
	active, err := exec.CommandContext(ctx, xprop, "-root", "_NET_ACTIVE_WINDOW").Output()
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(active))
	if len(fields) == 0 {
		return 0
	}
	window := fields[len(fields)-1]
	if id, err := strconv.ParseUint(window, 0, 64); err != nil || id == 0 {
		return 0
	}
	data, err := exec.CommandContext(ctx, xprop, "-id", window, "_NET_WM_PID").Output()
	if err != nil {
		return 0
	}
	fields = strings.Fields(string(data))
	if len(fields) == 0 {
		return 0
	}
	pid, _ := strconv.ParseInt(fields[len(fields)-1], 10, 32)
	if pid < 1 {
		return 0
	}
	return int32(pid)
}
