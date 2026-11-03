package tray

import (
	"os/exec"
	"syscall"

	"golang.org/x/sys/windows"
)

func windowCommand(exe string) *exec.Cmd {
	cmd := exec.Command(exe, "--ui")
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: windows.CREATE_NO_WINDOW}
	return cmd
}
