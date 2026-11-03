package collector

import (
	"context"
	"unsafe"
)

var foregroundWindow = user.NewProc("GetForegroundWindow")
var windowProcessID = user.NewProc("GetWindowThreadProcessId")

func foregroundProcessID(ctx context.Context) int32 {
	if ctx.Err() != nil {
		return 0
	}
	window, _, _ := foregroundWindow.Call()
	if window == 0 {
		return 0
	}
	var pid uint32
	thread, _, _ := windowProcessID.Call(window, uintptr(unsafe.Pointer(&pid)))
	if thread == 0 {
		return 0
	}
	return int32(pid)
}
