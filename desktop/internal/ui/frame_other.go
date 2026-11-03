//go:build !windows

package ui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
)

func companionWindow(app fyne.App, title string) fyne.Window { return app.NewWindow(title) }

func windowControls(_ *application, brand, nav fyne.CanvasObject) (fyne.CanvasObject, fyne.CanvasObject) {
	return container.NewBorder(nil, nil, nil, nav, brand), layout.NewSpacer()
}
