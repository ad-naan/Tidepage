package ui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/driver"
	"fyne.io/fyne/v2/driver/desktop"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"golang.org/x/sys/windows"
)

func companionWindow(app fyne.App, title string) fyne.Window {
	d, ok := app.Driver().(desktop.Driver)
	if !ok {
		return app.NewWindow(title)
	}
	win := d.CreateSplashWindow()
	win.SetTitle(title)
	return win
}

var user32 = windows.NewLazySystemDLL("user32.dll")
var postMessage = user32.NewProc("PostMessageW")
var showWindow = user32.NewProc("ShowWindowAsync")
var releaseCapture = user32.NewProc("ReleaseCapture")
var isZoomed = user32.NewProc("IsZoomed")
var messagePosition = user32.NewProc("GetMessagePos")

// SC_MOVE | HTCAPTION starts the native move loop at the mouse position.
const (
	wmSysCommand  = 0x0112
	scMoveCaption = 0xf012
	scMinimize    = 0xf020
	scMaximize    = 0xf030
)

func windowCommand(win fyne.Window, command uintptr) {
	native, ok := win.(driver.NativeWindow)
	if !ok {
		return
	}
	native.RunNative(func(ctx any) {
		handle := ctx.(driver.WindowsWindowContext).HWND
		switch command {
		case scMinimize:
			showWindow.Call(handle, windows.SW_MINIMIZE)
		case scMaximize:
			mode := uintptr(windows.SW_MAXIMIZE)
			if zoomed, _, _ := isZoomed.Call(handle); zoomed != 0 {
				mode = windows.SW_RESTORE
			}
			showWindow.Call(handle, mode)
		case scMoveCaption:
			releaseCapture.Call()
			pos, _, _ := messagePosition.Call()
			postMessage.Call(handle, wmSysCommand, command, pos)
		}
	})
}

type frameHandle struct {
	widget.BaseWidget
	face  fyne.CanvasObject
	press func()
}

func newFrameHandle(face fyne.CanvasObject, press func()) *frameHandle {
	h := &frameHandle{face: face, press: press}
	h.ExtendBaseWidget(h)
	return h
}

func (h *frameHandle) CreateRenderer() fyne.WidgetRenderer { return widget.NewSimpleRenderer(h.face) }
func (h *frameHandle) MouseUp(*desktop.MouseEvent)         {}
func (h *frameHandle) MouseDown(e *desktop.MouseEvent) {
	if e.Button == desktop.MouseButtonPrimary {
		h.press()
	}
}

type resizeGrip struct {
	widget.BaseWidget
	win       fyne.Window
	requested fyne.Size
}

func (g *resizeGrip) CreateRenderer() fyne.WidgetRenderer {
	image := canvas.NewImageFromResource(fyne.NewStaticResource("resize.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path d="m4 14 10-10m-5 10 5-5" stroke="#61756c" stroke-width="1.5" stroke-linecap="round"/></svg>`)))
	image.SetMinSize(fyne.NewSize(18, 18))
	return widget.NewSimpleRenderer(container.NewCenter(image))
}
func (g *resizeGrip) Dragged(e *fyne.DragEvent) {
	if g.requested.IsZero() {
		g.requested = g.win.Canvas().Size()
	}
	g.requested = g.requested.AddWidthHeight(e.Dragged.DX, e.Dragged.DY).Max(minimumWindowSize)
	g.win.Resize(g.requested)
}
func (g *resizeGrip) DragEnd() { g.requested = fyne.Size{} }

func windowControls(a *application, brand, nav fyne.CanvasObject) (fyne.CanvasObject, fyne.CanvasObject) {
	drag := newFrameHandle(brand, func() { windowCommand(a.win, scMoveCaption) })
	minimize := widget.NewButtonWithIcon("", theme.WindowMinimizeIcon(), func() { windowCommand(a.win, scMinimize) })
	maximize := widget.NewButtonWithIcon("", theme.WindowMaximizeIcon(), func() { windowCommand(a.win, scMaximize) })
	closeButton := widget.NewButtonWithIcon("", theme.WindowCloseIcon(), a.win.Close)
	for _, button := range []*widget.Button{minimize, maximize, closeButton} {
		button.Importance = widget.LowImportance
	}
	bar := container.NewBorder(nil, nil, nil, container.NewHBox(nav, minimize, maximize, closeButton), drag)
	grip := &resizeGrip{win: a.win}
	grip.ExtendBaseWidget(grip)
	return bar, grip
}
