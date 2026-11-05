package ui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/widget"
)

func column(gap float32, objects ...fyne.CanvasObject) *fyne.Container {
	return container.New(layout.NewCustomPaddedVBoxLayout(gap), objects...)
}

func row(gap float32, objects ...fyne.CanvasObject) *fyne.Container {
	return container.New(layout.NewCustomPaddedHBoxLayout(gap), objects...)
}

func textGroup(objects ...fyne.CanvasObject) fyne.CanvasObject {
	return container.NewThemeOverride(column(4, objects...), textTheme{})
}

func fieldGroup(label, hint string, control fyne.CanvasObject) fyne.CanvasObject {
	caption := container.New(layout.NewCustomPaddedLayout(7, 0, 0, 0), textGroup(heading(label)))
	labelColumn := container.NewGridWrap(fyne.NewSize(140, 32), caption)
	return container.NewBorder(nil, nil, labelColumn, nil, column(4, control, textGroup(small(hint))))
}

func checkGroup(check *widget.Check, hint string) fyne.CanvasObject {
	return column(0, check, container.New(layout.NewCustomPaddedLayout(0, 4, 32, 8), textGroup(small(hint))))
}

func sectionHeader(text string) fyne.CanvasObject {
	l := small(text)
	l.TextStyle.Bold = true
	return textGroup(l)
}

func actionFooter(hint string, button *widget.Button) fyne.CanvasObject {
	return column(10, widget.NewSeparator(), container.NewBorder(nil, nil, nil, container.NewCenter(button), textGroup(small(hint))))
}
