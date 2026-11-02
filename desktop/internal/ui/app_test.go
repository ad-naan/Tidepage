package ui

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/test"
	"fyne.io/fyne/v2/widget"
	"image/color"
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
	app := test.NewApp()
	defer app.Quit()
	app.Settings().SetTheme(tideTheme{})
	cfg := config.Default()
	cfg.Rules = []config.Rule{{ID: "editor", Name: "Visual Studio Code", Process: "Code.exe", Enabled: true}, {ID: "design", Name: "Figma", Process: "Figma.exe", Enabled: true}}
	a := &application{app: app, cfg: cfg, preview: true, t: i18n.Load("zh-CN"), iconCache: map[string]string{"editor": "", "design": ""}}
	a.win = app.NewWindow("Preview")
	defer a.win.Close()
	a.connection = widget.NewLabel("")
	a.previewBox = container.NewVBox()
	a.musicBox = container.NewVBox()
	a.syncLabel = widget.NewLabel("")
	a.warning = widget.NewLabel("")
	a.pause = widget.NewButton(a.t.Text("pause"), nil)
	a.content = container.NewStack()
	a.state = companion.State{Connection: "connected", SyncedAt: time.Now(), Presence: protocol.Presence{Status: "online", Apps: []protocol.App{{ID: "editor", Name: "Visual Studio Code"}, {ID: "design", Name: "Figma"}}, Track: &protocol.Track{Title: "Sunset Lover", Artist: "Petit Biscuit", Player: "Spotify"}}}
	minimum := canvas.NewRectangle(color.Transparent)
	minimum.SetMinSize(fyne.NewSize(860, 600))
	a.win.SetContent(container.NewStack(minimum, container.NewBorder(nil, nil, a.sidebar(), nil, pad(24, a.content))))
	a.win.Resize(fyne.NewSize(920, 650))
	a.win.Show()
	for _, page := range []string{"overview", "watch", "settings"} {
		a.page(page)
		capture(t, a, page)
		if a.win.Content().MinSize().Width < 860 {
			t.Fatal("window shrinks below the designed minimum")
		}
	}
	a.page("watch")
	a.ruleDialog(-1)
	capture(t, a, "add-application")
}
func capture(t *testing.T, a *application, name string) {
	t.Helper()
	if dir := os.Getenv("TIDEPAGE_RENDER_DIR"); dir != "" {
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
