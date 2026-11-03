package ui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/test"
	"fyne.io/fyne/v2/widget"
	"image/png"
	"os"
	"path/filepath"
	"testing"
	"tidepage.local/companion/internal/companion"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/i18n"
	"tidepage.local/companion/internal/protocol"
	"time"
)

func TestPreviewLayoutAndArtifacts(t *testing.T) {
	for _, locale := range []string{"zh-CN", "en"} {
		t.Run(locale, func(t *testing.T) { checkPreviewLayout(t, locale) })
	}
}

func checkPreviewLayout(t *testing.T, locale string) {
	app := test.NewApp()
	defer app.Quit()
	app.Settings().SetTheme(tideTheme{})
	cfg := config.Default()
	cfg.Locale = locale
	cfg.Rules = []config.Rule{{ID: "editor", Name: "Visual Studio Code", Process: "Code.exe", Enabled: true}, {ID: "design", Name: "Figma", Process: "Figma.exe", Enabled: true}}
	a := &application{app: app, cfg: cfg, preview: true, t: i18n.Load(locale), iconCache: map[string]string{"editor": "", "design": ""}}
	a.win = app.NewWindow("Preview")
	defer a.win.Close()
	a.win.SetPadded(false)
	a.connection = widget.NewLabel("")
	a.previewBox = container.NewVBox()
	a.musicBox = container.NewVBox()
	a.syncLabel = widget.NewLabel("")
	a.warning = widget.NewLabel("")
	a.pause = widget.NewButton(a.t.Text("pause"), nil)
	a.content = container.NewStack()
	a.state = companion.State{Connection: "connected", SyncedAt: time.Now(), Presence: protocol.Presence{Status: "online", Apps: []protocol.App{{ID: "editor", Name: "Visual Studio Code"}, {ID: "design", Name: "Figma"}}, Track: &protocol.Track{Title: "Sunset Lover", Artist: "Petit Biscuit", Player: "Spotify"}}}
	a.win.SetContent(a.shell())
	a.win.Resize(windowSize)
	a.win.Show()
	for _, page := range []string{"overview", "watch", "settings"} {
		test.Tap(a.nav[page])
		if a.activePage != page {
			t.Fatalf("navigation did not open %s", page)
		}
		capture(t, a, page)
		if size := a.win.Content().MinSize(); size.Width > minimumWindowSize.Width || size.Height > minimumWindowSize.Height {
			t.Fatalf("%s exceeds compact minimum: %v", page, size)
		}
	}
	// Live data arrives after the overview is mounted. Both columns must
	// contain their new rows without painting into the footer or one another.
	a.win.Resize(minimumWindowSize)
	state := a.state
	a.state = companion.State{}
	test.Tap(a.nav["overview"])
	a.state = state
	a.refresh()
	for _, column := range []*fyne.Container{a.previewBox, a.musicBox} {
		if len(column.Objects) != 2 || column.Size().Height < column.MinSize().Height {
			t.Fatalf("live rows overflow at minimum window size: height %v, need %v", column.Size().Height, column.MinSize().Height)
		}
	}
	a.win.Resize(windowSize)
	a.page("watch")
	a.ruleDialog(-1)
	capture(t, a, "add-application")
}
func capture(t *testing.T, a *application, name string) {
	t.Helper()
	if dir := os.Getenv("TIDEPAGE_RENDER_DIR"); dir != "" {
		if a.cfg.Locale != "zh-CN" {
			dir = filepath.Join(dir, a.cfg.Locale)
		}
		if e := os.MkdirAll(dir, 0755); e != nil {
			t.Fatal(e)
		}
		f, e := os.Create(filepath.Join(dir, name+".png"))
		if e != nil {
			t.Fatal(e)
		}
		defer f.Close()
		if e = png.Encode(f, a.win.Canvas().Capture()); e != nil {
			t.Fatal(e)
		}
	}
}
