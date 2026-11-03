//go:build !windows

package tray

import (
	"os"
	"os/exec"
)

func windowCommand(exe string) *exec.Cmd {
	cmd := exec.Command(exe, "--ui")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd
}
