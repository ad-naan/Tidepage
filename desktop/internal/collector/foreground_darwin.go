package collector

import (
	"context"
	"os/exec"
	"strconv"
	"strings"
)

func foregroundProcessID(ctx context.Context) int32 {
	// Public AppKit metadata, without System Events automation or window contents.
	script := `ObjC.import('AppKit'); var app = $.NSWorkspace.sharedWorkspace.frontmostApplication; app.isNil() ? 0 : app.processIdentifier;`
	data, err := exec.CommandContext(ctx, "/usr/bin/osascript", "-l", "JavaScript", "-e", script).Output()
	if err != nil {
		return 0
	}
	pid, _ := strconv.ParseInt(strings.TrimSpace(string(data)), 10, 32)
	if pid < 1 {
		return 0
	}
	return int32(pid)
}
