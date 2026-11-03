//go:build !darwin

package ui

import "fyne.io/fyne/v2"

func showCompanionWindow(win fyne.Window) { win.Show() }
