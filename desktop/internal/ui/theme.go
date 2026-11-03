package ui

import (
	"embed"
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/theme"
	"image/color"
	"sync"
)

//go:embed assets/*.ttf
var fontAssets embed.FS
var fontOnce sync.Once
var regularFont, semiboldFont fyne.Resource

var ink = color.NRGBA{37, 62, 56, 255}
var muted = color.NRGBA{85, 109, 101, 255}
var green = color.NRGBA{57, 117, 95, 255}
var paper = color.NRGBA{253, 253, 249, 255}
var surface = color.NRGBA{234, 242, 235, 255}
var border = color.NRGBA{224, 231, 221, 255}

type tideTheme struct{}

func (t tideTheme) Color(name fyne.ThemeColorName, variant fyne.ThemeVariant) color.Color {
	switch name {
	case theme.ColorNameBackground:
		return paper
	case theme.ColorNameForeground:
		return ink
	case theme.ColorNamePrimary, theme.ColorNameHyperlink, theme.ColorNameFocus:
		return green
	case theme.ColorNameButton:
		return color.NRGBA{231, 239, 231, 255}
	case theme.ColorNameInputBackground:
		return paper
	case theme.ColorNameDisabled, theme.ColorNamePlaceHolder:
		return muted
	case theme.ColorNameSeparator, theme.ColorNameInputBorder:
		return border
	case theme.ColorNameSelection, theme.ColorNameHover:
		return color.NRGBA{225, 234, 221, 255}
	}
	return theme.DefaultTheme().Color(name, theme.VariantLight)
}
func (t tideTheme) Font(s fyne.TextStyle) fyne.Resource {
	fontOnce.Do(func() {
		regularData, _ := fontAssets.ReadFile("assets/TidepageSans-Regular.ttf")
		semiboldData, _ := fontAssets.ReadFile("assets/TidepageSans-Semibold.ttf")
		regularFont = fyne.NewStaticResource("TidepageSans-Regular.ttf", regularData)
		semiboldFont = fyne.NewStaticResource("TidepageSans-Semibold.ttf", semiboldData)
	})
	if s.Monospace {
		return theme.DefaultTheme().Font(s)
	}
	if s.Bold {
		return semiboldFont
	}
	return regularFont
}
func (t tideTheme) Icon(n fyne.ThemeIconName) fyne.Resource { return theme.DefaultTheme().Icon(n) }
func (t tideTheme) Size(n fyne.ThemeSizeName) float32 {
	switch n {
	case theme.SizeNameText:
		return 13
	case theme.SizeNameInnerPadding:
		return 5
	case theme.SizeNameCaptionText:
		return 12
	case theme.SizeNameHeadingText:
		return 20
	case theme.SizeNameSubHeadingText:
		return 18
	case theme.SizeNamePadding:
		return 5
	case theme.SizeNameInputRadius, theme.SizeNameSelectionRadius:
		return 7
	}
	return theme.DefaultTheme().Size(n)
}

var appIcon = fyne.NewStaticResource("tidepage.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#e1eadd"/><path d="M12 34c8 0 9 8 18 4s12-12 22-9M12 41c8 0 10 7 19 4s11-10 21-8" fill="none" stroke="#39755f" stroke-width="3" stroke-linecap="round"/></svg>`))

// Static tide lines for the public-presence panel.
var tideLines = fyne.NewStaticResource("tide-lines.svg", []byte(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 156 58" fill="none">
<g stroke="#93b7a3" stroke-width="1.6" stroke-linecap="round">
<path d="M2 34C31 35 37 9 65 12S102 47 152 20"/>
<path d="M3 41C35 42 40 17 67 20S105 52 153 27"/>
<path d="M4 48C37 49 43 25 69 28S108 57 154 34"/>
</g></svg>`))
