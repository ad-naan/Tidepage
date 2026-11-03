package ui

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework AppKit
#import <AppKit/AppKit.h>
#include <stdint.h>

static void blendTitlebar(uintptr_t handle, double red, double green, double blue) {
	NSWindow *window = (NSWindow *)handle;
	window.titleVisibility = NSWindowTitleHidden;
	window.titlebarAppearsTransparent = YES;
	window.backgroundColor = [NSColor colorWithSRGBRed:red green:green blue:blue alpha:1];
	if (@available(macOS 11.0, *)) {
		window.titlebarSeparatorStyle = NSTitlebarSeparatorStyleNone;
	}
}
*/
import "C"

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/driver"
)

// Keep the titled, resizable AppKit window and its reserved traffic-light area.
// Applying the appearance after Show gives Fyne a chance to create the NSWindow.
func showCompanionWindow(win fyne.Window) {
	win.Show()
	if native, ok := win.(driver.NativeWindow); ok {
		native.RunNative(func(ctx any) {
			if mac, ok := ctx.(driver.MacWindowContext); ok && mac.NSWindow != 0 {
				C.blendTitlebar(C.uintptr_t(mac.NSWindow), C.double(surface.R)/255, C.double(surface.G)/255, C.double(surface.B)/255)
			}
		})
	}
}
