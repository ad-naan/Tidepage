//go:build !windows

package ui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
)

func companionWindow(app fyne.App, title string) fyne.Window { return app.NewWindow(title) }

func windowControls(_ *application, brand fyne.CanvasObject) (fyne.CanvasObject, fyne.CanvasObject) {
	return container.NewStack(brand), layout.NewSpacer()
}
