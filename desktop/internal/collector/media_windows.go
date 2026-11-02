package collector

import (
	"context"
	"errors"
	"fmt"
	"github.com/ebitengine/purego"
	"golang.org/x/sys/windows"
	"runtime"
	"sync"
	"syscall"
	"tidepage.local/companion/internal/protocol"
	"time"
	"unsafe"
)

// Minimal checked bindings for public Windows.Media.Control APIs. No helper
// executable, PowerShell, private API or C++ bridge is loaded at runtime.
type comObject struct{ vtbl *[40]uintptr }

//go:uintptrescapes
func (p *comObject) call(slot int, args ...uintptr) error {
	if p == nil {
		return errors.New("nil COM object")
	}
	values := append([]uintptr{uintptr(unsafe.Pointer(p))}, args...)
	hr, _, _ := syscall.SyscallN(p.vtbl[slot], values...)
	runtime.KeepAlive(p)
	if int32(hr) < 0 {
		return fmt.Errorf("WinRT HRESULT %08x", uint32(hr))
	}
	return nil
}
func (p *comObject) release() {
	if p != nil {
		_ = p.call(2)
	}
}
func (p *comObject) object(slot int) (*comObject, error) {
	var result *comObject
	e := p.call(slot, uintptr(unsafe.Pointer(&result)))
	return result, e
}

var combase = windows.NewLazySystemDLL("combase.dll")
var roInit, roUninit, roFactory = combase.NewProc("RoInitialize"), combase.NewProc("RoUninitialize"), combase.NewProc("RoGetActivationFactory")
var createHString, deleteHString, rawHString = combase.NewProc("WindowsCreateString"), combase.NewProc("WindowsDeleteString"), combase.NewProc("WindowsGetStringRawBuffer")
var stringBufferOnce sync.Once
var getStringBuffer func(uintptr, *uint32) *uint16

func hStringText(h uintptr) string {
	stringBufferOnce.Do(func() { purego.RegisterFunc(&getStringBuffer, rawHString.Addr()) })
	var length uint32
	ptr := getStringBuffer(h, &length)
	if ptr == nil || length > 32768 {
		return ""
	}
	return stringLimit(windows.UTF16ToString(unsafe.Slice(ptr, length)), 200)
}

func (p *comObject) text(slot int) string {
	var h uintptr
	if p.call(slot, uintptr(unsafe.Pointer(&h))) != nil || h == 0 {
		return ""
	}
	defer deleteHString.Call(h)
	return hStringText(h)
}
func awaitObject(ctx context.Context, op *comObject) (*comObject, error) {
	if op == nil {
		return nil, errors.New("nil WinRT operation")
	}
	defer op.release()
	iid, _ := windows.GUIDFromString("{00000036-0000-0000-C000-000000000046}")
	var info *comObject
	if e := op.call(0, uintptr(unsafe.Pointer(&iid)), uintptr(unsafe.Pointer(&info))); e != nil {
		return nil, e
	}
	defer info.release()
	ticker := time.NewTicker(15 * time.Millisecond)
	defer ticker.Stop()
	for {
		var status int32
		if e := info.call(7, uintptr(unsafe.Pointer(&status))); e != nil {
			return nil, e
		}
		switch status {
		case 1:
			return op.object(8)
		case 2, 3:
			var code int32
			_ = info.call(8, uintptr(unsafe.Pointer(&code)))
			return nil, fmt.Errorf("WinRT operation failed: %08x", uint32(code))
		}
		select {
		case <-ctx.Done():
			_ = info.call(9)
			return nil, ctx.Err()
		case <-ticker.C:
		}
	}
}
func nowPlaying(ctx context.Context) (*protocol.Track, error) {
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	hr, _, _ := roInit.Call(1)
	if int32(hr) < 0 {
		return nil, errors.New("WinRT unavailable")
	}
	defer roUninit.Call()
	name, _ := windows.UTF16FromString("Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager")
	var hs uintptr
	hr, _, _ = createHString.Call(uintptr(unsafe.Pointer(&name[0])), uintptr(len(name)-1), uintptr(unsafe.Pointer(&hs)))
	if int32(hr) < 0 {
		return nil, errors.New("WinRT string failed")
	}
	defer deleteHString.Call(hs)
	iid, _ := windows.GUIDFromString("{2050C4EE-11A0-57DE-AED7-C97C70338245}")
	var factory *comObject
	hr, _, _ = roFactory.Call(hs, uintptr(unsafe.Pointer(&iid)), uintptr(unsafe.Pointer(&factory)))
	if int32(hr) < 0 || factory == nil {
		return nil, errors.New("media control unavailable")
	}
	defer factory.release()
	op, e := factory.object(6)
	if e != nil {
		return nil, e
	}
	manager, e := awaitObject(ctx, op)
	if e != nil {
		return nil, e
	}
	defer manager.release()
	sessions, e := manager.object(7)
	if e != nil || sessions == nil {
		return nil, e
	}
	defer sessions.release()
	var size uint32
	if e = sessions.call(7, uintptr(unsafe.Pointer(&size))); e != nil {
		return nil, e
	}
	for index := uint32(0); index < min(size, 16); index++ {
		var session *comObject
		if sessions.call(6, uintptr(index), uintptr(unsafe.Pointer(&session))) != nil || session == nil {
			continue
		}
		track, err := sessionTrack(ctx, session)
		session.release()
		if err != nil {
			return nil, err
		}
		if track != nil {
			return track, nil
		}
	}
	return nil, nil
}
func sessionTrack(ctx context.Context, session *comObject) (*protocol.Track, error) {
	info, e := session.object(9)
	if e != nil || info == nil {
		return nil, e
	}
	var state int32
	e = info.call(7, uintptr(unsafe.Pointer(&state)))
	info.release()
	if e != nil || state != 4 {
		return nil, e
	}
	op, e := session.object(7)
	if e != nil {
		return nil, e
	}
	properties, e := awaitObject(ctx, op)
	if e != nil || properties == nil {
		return nil, e
	}
	defer properties.release()
	title := properties.text(6)
	if title == "" {
		return nil, nil
	}
	return &protocol.Track{Title: title, Artist: properties.text(9), Album: properties.text(10), Player: stringLimit(session.text(6), 120)}, nil
}
