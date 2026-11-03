package main

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

func init() {
	// Explorer gives ad-hoc console builds their own console. Release only
	// that console, keeping output attached when launched from a shell.
	kernel := windows.NewLazySystemDLL("kernel32.dll")
	var pid uint32
	count, _, _ := kernel.NewProc("GetConsoleProcessList").Call(uintptr(unsafe.Pointer(&pid)), 1)
	if count == 1 {
		kernel.NewProc("FreeConsole").Call()
	}
}
