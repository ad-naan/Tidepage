package ui

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/canvas"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/dialog"
	"fyne.io/fyne/v2/lang"
	"fyne.io/fyne/v2/layout"
	"fyne.io/fyne/v2/storage"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"image/color"
	"io"
	"path/filepath"
	"strconv"
	"strings"
	"sync/atomic"
	"tidepage.local/companion/internal/collector"
	"tidepage.local/companion/internal/companion"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/i18n"
	"tidepage.local/companion/internal/localipc"
	"tidepage.local/companion/internal/platform"
	"tidepage.local/companion/internal/protocol"
	"time"
)

type Options struct {
	Dir                 string
	Background, Preview bool
	Page                string
	Config              config.Config
	LoadError           bool
}
type application struct {
	app                     fyne.App
	win                     fyne.Window
	t                       i18n.Catalog
	cfg                     config.Config
	dir, token              string
	preview                 bool
	saving                  bool
	nav                     map[string]*widget.Button
	iconCache               map[string]string
	activePage              string
	controller              *localipc.Remote
	visible                 atomic.Bool
	content                 *fyne.Container
	connection              *widget.Label
	previewBox              *fyne.Container
	musicBox                *fyne.Container
	syncLabel, warning      *widget.Label
	pause                   *widget.Button
	endpoint, tokenEntry    *widget.Entry
	music, icons, autostart *widget.Check
	locale, interval        *widget.Select
	rules                   *fyne.Container
	save                    *widget.Button
	state                   companion.State
}

func Run(options Options) {
	a := &application{cfg: options.Config, dir: options.Dir, preview: options.Preview, t: i18n.Load(options.Config.Locale)}
	if options.Preview {
		a.cfg.Rules = []config.Rule{{ID: "code", Name: "Visual Studio Code", Process: "Code.exe", Enabled: true}, {ID: "figma", Name: "Figma", Process: "Figma.exe", Enabled: true}}
		a.iconCache = map[string]string{"code": "", "figma": ""}
	}
	a.app = app.NewWithID("blog.tidepage.companion")
	translations, _ := json.Marshal(map[string]string{"(Select one)": a.t.Text("selectPlaceholder")})
	_ = lang.AddTranslationsForLocale(translations, fyne.Locale("zh-Hans"))
	_ = lang.AddTranslationsForLocale(translations, fyne.Locale("zh-CN"))
	a.app.Settings().SetTheme(tideTheme{})
	a.app.SetIcon(appIcon)
	a.win = a.app.NewWindow(a.t.Text("app"))
	a.win.SetIcon(appIcon)
	a.win.Resize(fyne.NewSize(920, 650))
	a.win.SetPadded(false)
	a.connection = widget.NewLabel(a.t.Text("disconnected"))
	a.connection.Wrapping = fyne.TextWrapWord
	a.previewBox = container.NewVBox()
	a.musicBox = container.NewVBox()
	a.syncLabel = widget.NewLabel(a.t.Text("notSynced"))
	a.syncLabel.Wrapping = fyne.TextWrapWord
	a.warning = widget.NewLabel("")
	a.warning.Wrapping = fyne.TextWrapWord
	a.warning.Hide()
	a.pause = widget.NewButton(a.t.Text("pause"), func() {
		if a.controller != nil {
			a.controller.Pause(!a.state.Paused)
		}
	})
	a.content = container.NewStack()
	minimum := canvas.NewRectangle(color.Transparent)
	minimum.SetMinSize(fyne.NewSize(860, 600))
	a.win.SetContent(container.NewStack(minimum, container.NewBorder(nil, nil, a.sidebar(), nil, pad(24, a.content))))
	a.win.SetCloseIntercept(func() { a.visible.Store(false); a.app.Quit() })
	a.page(options.Page)
	if options.Preview {
		a.state = companion.State{Presence: protocol.Presence{Status: "online", Apps: []protocol.App{{ID: "code", Name: "Visual Studio Code"}, {ID: "figma", Name: "Figma"}}, Track: &protocol.Track{Title: "Sunset Lover", Artist: "Petit Biscuit", Player: "Spotify"}}, Connection: "connected", SyncedAt: time.Now()}
		a.refresh()
	} else {
		remote, err := localipc.Connect(a.dir, func(s companion.State) {
			fyne.Do(func() {
				a.state = s
				if a.visible.Load() {
					a.refresh()
				}
			})
		})
		if err != nil {
			dialog.ShowInformation(a.t.Text("error"), a.t.Text("hostUnavailable"), a.win)
		} else {
			a.controller = remote
			defer remote.Close()
		}
		token, e := platform.LoadToken(a.cfg.Endpoint)
		a.token = token
		if e != nil {
			dialog.ShowInformation(a.t.Text("error"), a.t.Text("credentialError"), a.win)
		}
		if options.LoadError {
			dialog.ShowInformation(a.t.Text("error"), a.t.Text("loadError"), a.win)
		}
	}
	a.show()
	a.app.Run()
}
func (a *application) show() {
	a.visible.Store(true)
	if a.controller != nil {
		a.state = a.controller.Snapshot()
	}
	a.refresh()
	a.win.Show()
	a.win.RequestFocus()
}
func (a *application) sidebar() fyne.CanvasObject {
	brand := canvas.NewText(a.t.Text("brand"), ink)
	brand.TextSize = 23
	brand.TextStyle = fyne.TextStyle{Bold: true}
	logo := canvas.NewImageFromResource(appIcon)
	logo.SetMinSize(fyne.NewSize(30, 30))
	logo.FillMode = canvas.ImageFillContain
	nav := container.NewVBox(pad(10, container.NewVBox(container.NewHBox(logo, brand), small(a.t.Text("tagline")))), spacer(18))
	a.nav = make(map[string]*widget.Button)
	for _, item := range []struct {
		key  string
		icon fyne.Resource
	}{{"overview", theme.HomeIcon()}, {"watch", theme.ComputerIcon()}, {"settings", theme.SettingsIcon()}} {
		key := item.key
		b := widget.NewButtonWithIcon(a.t.Text(key), item.icon, func() { a.page(key) })
		b.Alignment = widget.ButtonAlignLeading
		b.Importance = widget.LowImportance
		a.nav[key] = b
		nav.Add(b)
	}
	foot := container.NewVBox(widget.NewSeparator(), a.connection, small(a.t.Text("version")))
	bg := canvas.NewRectangle(color.NRGBA{243, 245, 238, 255})
	bg.SetMinSize(fyne.NewSize(180, 0))
	return container.NewStack(bg, container.NewPadded(container.NewBorder(nav, foot, nil, nil)))
}
func (a *application) page(key string) {
	if key != "watch" && key != "settings" {
		key = "overview"
	}
	a.activePage = key
	for name, button := range a.nav {
		button.Importance = widget.LowImportance
		if name == key {
			button.Importance = widget.MediumImportance
		}
		button.Refresh()
	}
	var view fyne.CanvasObject
	switch key {
	case "watch":
		view = a.watchPage()
	case "settings":
		view = a.settingsPage()
	default:
		view = a.overview()
	}
	a.content.Objects = []fyne.CanvasObject{view}
	a.content.Refresh()
	a.refresh()
}
func title(label, hint string) fyne.CanvasObject {
	h := canvas.NewText(label, ink)
	h.TextSize = 22
	h.TextStyle = fyne.TextStyle{Bold: true}
	sub := small(hint)
	return container.NewVBox(h, sub, spacer(12))
}
func small(text string) *widget.Label {
	l := widget.NewLabel(text)
	l.Importance = widget.LowImportance
	l.Wrapping = fyne.TextWrapWord
	return l
}
func spacer(height float32) fyne.CanvasObject {
	r := canvas.NewRectangle(color.Transparent)
	r.SetMinSize(fyne.NewSize(1, height))
	return r
}
func pad(value float32, object fyne.CanvasObject) fyne.CanvasObject {
	return container.New(layout.NewCustomPaddedLayout(value, value, value, value), object)
}
func card(content fyne.CanvasObject, accent bool) fyne.CanvasObject {
	bg := canvas.NewRectangle(paper)
	bg.CornerRadius = 12
	bg.StrokeColor = border
	bg.StrokeWidth = 1
	if accent {
		bg.FillColor = surface
		bg.StrokeWidth = 0
	}
	return container.NewStack(bg, container.NewPadded(container.NewPadded(content)))
}
func (a *application) overview() fyne.CanvasObject {
	footer := container.NewVBox(widget.NewSeparator(), container.NewBorder(nil, nil, nil, a.pause, container.NewVBox(small(a.t.Text("privacy")), small(a.t.Text("privacyDetail")))), a.syncLabel, a.warning)
	body := container.NewVBox(title(a.t.Text("overview"), a.t.Text("overviewHint")), card(container.NewVBox(small(a.t.Text("preview")), a.previewBox), true), spacer(10), widget.NewLabelWithStyle(a.t.Text("listening"), fyne.TextAlignLeading, fyne.TextStyle{Bold: true}), card(a.musicBox, false))
	return container.NewPadded(container.NewBorder(nil, footer, nil, nil, container.NewVScroll(body)))
}
func appImage(p protocol.App) fyne.CanvasObject {
	var img *canvas.Image
	if p.Icon != "" {
		raw, e := base64.StdEncoding.DecodeString(strings.TrimPrefix(p.Icon, "data:image/png;base64,"))
		if e == nil {
			img = canvas.NewImageFromResource(fyne.NewStaticResource(p.ID+".png", raw))
		}
	}
	if img == nil {
		img = canvas.NewImageFromResource(theme.ComputerIcon())
	}
	img.FillMode = canvas.ImageFillContain
	img.SetMinSize(fyne.NewSize(32, 32))
	return img
}
func (a *application) refresh() {
	s := a.state
	a.connection.SetText(a.t.Text(s.Connection))
	a.pause.SetText(a.t.Text("pause"))
	if s.Paused {
		a.pause.SetText(a.t.Text("resume"))
	}
	status := a.t.Text("online")
	if s.Paused {
		status = a.t.Text("paused")
	} else if s.Connection != "connected" {
		status = a.t.Text("offline")
	}
	a.previewBox.Objects = []fyne.CanvasObject{widget.NewLabelWithStyle(a.t.Text("author"), fyne.TextAlignLeading, fyne.TextStyle{Bold: true}), widget.NewLabel(status)}
	if len(s.Presence.Apps) == 0 {
		a.previewBox.Add(small(a.t.Text("noApps")))
	} else {
		for _, p := range s.Presence.Apps {
			a.previewBox.Add(container.NewBorder(nil, nil, appImage(p), nil, widget.NewLabel(p.Name)))
		}
	}
	a.previewBox.Refresh()
	a.musicBox.Objects = nil
	if track := s.Presence.Track; track != nil {
		a.musicBox.Add(widget.NewLabelWithStyle(track.Title, fyne.TextAlignLeading, fyne.TextStyle{Bold: true}))
		a.musicBox.Add(small(track.Artist + " · " + track.Player))
	} else {
		a.musicBox.Add(small(a.t.Text("noTrack")))
	}
	a.musicBox.Refresh()
	if s.SyncedAt.IsZero() {
		a.syncLabel.SetText(a.t.Text("notSynced"))
	} else {
		a.syncLabel.SetText(a.t.Text("lastSync") + "  " + s.SyncedAt.Local().Format("15:04:05"))
	}
	if s.Warning != "" {
		a.warning.SetText(a.t.Text(s.Warning))
		a.warning.Show()
	} else {
		a.warning.Hide()
	}
}
func (a *application) watchPage() fyne.CanvasObject {
	a.rules = container.NewVBox()
	a.renderRules()
	add := widget.NewButtonWithIcon(a.t.Text("add"), theme.ContentAddIcon(), func() {
		if len(a.cfg.Rules) >= 12 {
			dialog.ShowInformation(a.t.Text("watch"), a.t.Text("ruleLimit"), a.win)
			return
		}
		a.ruleDialog(-1)
	})
	a.icons = widget.NewCheck(a.t.Text("shareIcons"), func(v bool) { a.cfg.Icons = v })
	a.icons.SetChecked(a.cfg.Icons)
	save := widget.NewButton(a.t.Text("save"), func() { a.persist(false) })
	save.Importance = widget.HighImportance
	add.Importance = widget.HighImportance
	header := container.NewVBox(container.NewBorder(nil, nil, nil, container.NewVBox(add, layout.NewSpacer()), title(a.t.Text("watch"), a.t.Text("watchHint"))), small(a.t.Text("priority")), spacer(12))
	footer := container.NewVBox(widget.NewSeparator(), a.icons, small(a.t.Text("shareIconsHint")), container.NewBorder(nil, nil, nil, save, small(a.t.Text("unsaved"))))
	return container.NewPadded(container.NewBorder(header, footer, nil, nil, container.NewVScroll(a.rules)))
}
func (a *application) renderRules() {
	a.rules.Objects = nil
	if a.iconCache == nil {
		a.iconCache = make(map[string]string)
	}
	if len(a.cfg.Rules) == 0 {
		a.rules.Add(card(small(a.t.Text("emptyRules")), false))
	}
	for i, r := range a.cfg.Rules {
		index, rule := i, r
		enabled := widget.NewCheck("", func(v bool) { a.cfg.Rules[index].Enabled = v })
		enabled.SetChecked(rule.Enabled)
		details := container.NewVBox(widget.NewLabelWithStyle(rule.Name, fyne.TextAlignLeading, fyne.TextStyle{Bold: true}), small(rule.Process))
		icon := appImage(protocol.App{ID: rule.ID, Name: rule.Name, Icon: a.iconCache[rule.ID]})
		if _, loaded := a.iconCache[rule.ID]; !loaded {
			a.iconCache[rule.ID] = ""
			go func() {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				defer cancel()
				p := collector.Process{Name: filepath.Base(rule.Process), Path: rule.Process}
				if !strings.ContainsAny(rule.Process, "/\\") {
					if ps, e := collector.Running(ctx); e == nil {
						for _, candidate := range ps {
							if collector.Matches(rule.Process, candidate.Name, candidate.Path) {
								p = candidate
								break
							}
						}
					}
				}
				value, _ := collector.ResolveIcon(ctx, rule.Icon, p)
				fyne.Do(func() {
					a.iconCache[rule.ID] = value
					if a.activePage == "watch" {
						a.renderRules()
					}
				})
			}()
		}
		edit := widget.NewButtonWithIcon("", theme.DocumentCreateIcon(), func() { a.ruleDialog(index) })
		edit.SetText(a.t.Text("edit"))
		up := widget.NewButtonWithIcon("", theme.MoveUpIcon(), func() {
			a.cfg.Rules[index-1], a.cfg.Rules[index] = a.cfg.Rules[index], a.cfg.Rules[index-1]
			a.renderRules()
		})
		up.SetText(a.t.Text("up"))
		if index == 0 {
			up.Disable()
		}
		down := widget.NewButtonWithIcon("", theme.MoveDownIcon(), func() {
			a.cfg.Rules[index+1], a.cfg.Rules[index] = a.cfg.Rules[index], a.cfg.Rules[index+1]
			a.renderRules()
		})
		down.SetText(a.t.Text("down"))
		if index == len(a.cfg.Rules)-1 {
			down.Disable()
		}
		remove := widget.NewButtonWithIcon("", theme.DeleteIcon(), func() {
			dialog.ShowConfirm(a.t.Text("remove"), a.t.Text("confirmRemove"), func(ok bool) {
				if ok {
					a.cfg.Rules = append(a.cfg.Rules[:index], a.cfg.Rules[index+1:]...)
					a.renderRules()
				}
			}, a.win)
		})
		remove.SetText(a.t.Text("remove"))
		more := widget.NewButtonWithIcon("", theme.MoreHorizontalIcon(), nil)
		more.Importance = widget.LowImportance
		more.OnTapped = func() {
			menu := fyne.NewMenu("", fyne.NewMenuItem(a.t.Text("edit"), func() { a.ruleDialog(index) }))
			if index > 0 {
				menu.Items = append(menu.Items, fyne.NewMenuItem(a.t.Text("up"), up.OnTapped))
			}
			if index < len(a.cfg.Rules)-1 {
				menu.Items = append(menu.Items, fyne.NewMenuItem(a.t.Text("down"), down.OnTapped))
			}
			menu.Items = append(menu.Items, fyne.NewMenuItemSeparator(), fyne.NewMenuItem(a.t.Text("remove"), remove.OnTapped))
			widget.ShowPopUpMenuAtPosition(menu, a.win.Canvas(), fyne.CurrentApp().Driver().AbsolutePositionForObject(more).Add(fyne.NewPos(0, more.Size().Height)))
		}
		a.rules.Add(pad(8, container.NewBorder(nil, nil, container.NewHBox(enabled, icon), more, details)))
		a.rules.Add(widget.NewSeparator())
	}
	a.rules.Refresh()
}
func (a *application) ruleDialog(index int) {
	rule := config.Rule{Enabled: true}
	if index >= 0 {
		rule = a.cfg.Rules[index]
	}
	name, process := widget.NewEntry(), widget.NewEntry()
	name.SetText(rule.Name)
	process.SetText(rule.Process)
	process.SetPlaceHolder(a.t.Text("processHint"))
	iconLabel := small(a.t.Text("automaticIcon"))
	iconBox := container.NewStack(appImage(protocol.App{ID: "editor"}))
	iconBox.Resize(fyne.NewSize(44, 44))
	previewName := widget.NewLabelWithStyle(a.t.Text("newApplication"), fyne.TextAlignLeading, fyne.TextStyle{Bold: true})
	name.OnChanged = func(value string) {
		if value == "" {
			value = a.t.Text("newApplication")
		}
		previewName.SetText(value)
	}
	name.OnChanged(name.Text)
	var currentCancel context.CancelFunc
	var debounce *time.Timer
	generation := 0
	active := true
	refreshIcon := func() {
		generation++
		request := generation
		custom, match := rule.Icon, strings.TrimSpace(process.Text)
		if currentCancel != nil {
			currentCancel()
		}
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		currentCancel = cancel
		if match == "" && custom == "" {
			return
		}
		iconLabel.SetText(a.t.Text("readingIcon"))
		go func() {
			defer cancel()
			p := collector.Process{Name: filepath.Base(match), Path: match}
			if !strings.ContainsAny(match, "/\\") {
				if ps, e := collector.Running(ctx); e == nil {
					for _, candidate := range ps {
						if collector.Matches(match, candidate.Name, candidate.Path) {
							p = candidate
							break
						}
					}
				}
			}
			value, e := collector.ResolveIcon(ctx, custom, p)
			fyne.Do(func() {
				if !active || request != generation {
					return
				}
				iconBox.Objects = []fyne.CanvasObject{appImage(protocol.App{ID: "editor", Icon: value})}
				iconBox.Refresh()
				if e != nil {
					iconLabel.SetText(a.t.Text("iconUnavailable"))
				} else {
					iconLabel.SetText(a.t.Text("iconReady"))
				}
			})
		}()
	}
	process.OnChanged = func(string) {
		if debounce != nil {
			debounce.Stop()
		}
		debounce = time.AfterFunc(450*time.Millisecond, func() {
			fyne.Do(func() {
				if active {
					refreshIcon()
				}
			})
		})
	}
	pickExe := widget.NewButtonWithIcon(a.t.Text("chooseExecutable"), theme.FolderOpenIcon(), func() {
		dialog.ShowFileOpen(func(file fyne.URIReadCloser, e error) {
			if e != nil || file == nil {
				return
			}
			path := file.URI().Path()
			file.Close()
			process.SetText(path)
			if name.Text == "" {
				name.SetText(strings.TrimSuffix(filepath.Base(path), filepath.Ext(path)))
			}
		}, a.win)
	})
	pickRunning := widget.NewButtonWithIcon(a.t.Text("chooseRunning"), theme.ComputerIcon(), func() {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
			defer cancel()
			ps, e := collector.Running(ctx)
			fyne.Do(func() {
				if !active {
					return
				}
				if e != nil {
					dialog.ShowInformation(a.t.Text("error"), a.t.Text("runError"), a.win)
					return
				}
				values := make([]string, len(ps))
				for i, p := range ps {
					values[i] = p.Name
				}
				selectBox := widget.NewSelect(values, nil)
				selectBox.PlaceHolder = a.t.Text("selectPlaceholder")
				picker := dialog.NewCustomConfirm(a.t.Text("selectProcess"), a.t.Text("choose"), a.t.Text("cancel"), selectBox, func(ok bool) {
					if ok && selectBox.Selected != "" {
						process.SetText(selectBox.Selected)
						if name.Text == "" {
							name.SetText(strings.TrimSuffix(selectBox.Selected, filepath.Ext(selectBox.Selected)))
						}
					}
				}, a.win)
				picker.Resize(fyne.NewSize(420, 170))
				picker.Show()
			})
		}()
	})
	pickIcon := widget.NewButton(a.t.Text("chooseIcon"), func() {
		fd := dialog.NewFileOpen(func(file fyne.URIReadCloser, e error) {
			if e != nil || file == nil {
				return
			}
			defer file.Close()
			data, e := io.ReadAll(io.LimitReader(file, 4*1024*1024+1))
			if e != nil || len(data) > 4*1024*1024 || len(data) < 8 || string(data[:8]) != "\x89PNG\r\n\x1a\n" {
				dialog.ShowInformation(a.t.Text("error"), a.t.Text("iconError"), a.win)
				return
			}
			rule.Icon = file.URI().Path()
			refreshIcon()
		}, a.win)
		fd.SetFilter(storage.NewExtensionFileFilter([]string{".png"}))
		fd.Show()
	})
	resetIcon := widget.NewButton(a.t.Text("automaticIcon"), func() { rule.Icon = ""; refreshIcon() })
	resetIcon.Importance = widget.LowImportance
	preview := card(container.NewBorder(nil, nil, container.NewGridWrap(fyne.NewSize(44, 44), iconBox), nil, container.NewVBox(previewName, iconLabel)), true)
	form := container.NewVBox(preview, spacer(6), widget.NewLabel(a.t.Text("name")), name, widget.NewLabel(a.t.Text("process")), process, container.NewGridWithColumns(2, pickRunning, pickExe), widget.NewSeparator(), container.NewHBox(pickIcon, resetIcon), small(a.t.Text("ruleHint")))
	heading := a.t.Text("add")
	if index >= 0 {
		heading = a.t.Text("edit")
	}
	modal := dialog.NewCustomConfirm(heading, a.t.Text("save"), a.t.Text("cancel"), pad(8, form), func(ok bool) {
		active = false
		if currentCancel != nil {
			currentCancel()
		}
		if debounce != nil {
			debounce.Stop()
		}
		if !ok {
			return
		}
		rule.Name = strings.TrimSpace(name.Text)
		rule.Process = strings.TrimSpace(process.Text)
		if rule.ID == "" {
			var id [12]byte
			_, _ = rand.Read(id[:])
			rule.ID = hex.EncodeToString(id[:])
		}
		candidate := a.cfg
		candidate.Rules = []config.Rule{rule}
		if candidate.Validate() != nil {
			dialog.ShowInformation(a.t.Text("error"), a.t.Text("invalidRule"), a.win)
			return
		}
		delete(a.iconCache, rule.ID)
		if index >= 0 {
			a.cfg.Rules[index] = rule
		} else {
			a.cfg.Rules = append(a.cfg.Rules, rule)
		}
		a.renderRules()
	}, a.win)
	modal.Resize(fyne.NewSize(570, 510))
	modal.Show()
	if rule.Process != "" || rule.Icon != "" {
		refreshIcon()
	}
}
func (a *application) settingsPage() fyne.CanvasObject {
	a.endpoint = widget.NewEntry()
	a.endpoint.SetText(a.cfg.Endpoint)
	a.tokenEntry = widget.NewPasswordEntry()
	a.tokenEntry.SetText(a.token)
	a.music = widget.NewCheck(a.t.Text("music"), nil)
	a.music.SetChecked(a.cfg.Music)
	a.autostart = widget.NewCheck(a.t.Text("autostart"), nil)
	a.autostart.SetChecked(a.cfg.Autostart)
	a.locale = widget.NewSelect([]string{a.t.Text("zhName"), a.t.Text("enName")}, nil)
	a.locale.SetSelected(a.t.Text("zhName"))
	if a.cfg.Locale == "en" {
		a.locale.SetSelected(a.t.Text("enName"))
	}
	a.interval = widget.NewSelect([]string{"5", "10", "15", "30", "60"}, nil)
	a.interval.SetSelected(strconv.Itoa(a.cfg.Interval))
	a.save = widget.NewButton(a.t.Text("connect"), func() { a.persist(true) })
	a.save.Importance = widget.HighImportance
	body := container.NewVBox(title(a.t.Text("settings"), a.t.Text("settingsHint")), widget.NewForm(widget.NewFormItem(a.t.Text("endpoint"), a.endpoint)), small(a.t.Text("endpointHint")), widget.NewForm(widget.NewFormItem(a.t.Text("token"), a.tokenEntry)), small(a.t.Text("tokenHint")), widget.NewSeparator(), a.music, small(a.t.Text("musicHint")), a.autostart, small(a.t.Text("autostartHint")), widget.NewForm(widget.NewFormItem(a.t.Text("interval"), a.interval), widget.NewFormItem(a.t.Text("locale"), a.locale)), small(a.t.Text("intervalHint")), small(a.t.Text("languageRestart")))
	return container.NewPadded(container.NewBorder(nil, container.NewVBox(widget.NewSeparator(), container.NewHBox(layout.NewSpacer(), a.save)), nil, nil, container.NewVScroll(body)))
}
func (a *application) persist(connection bool) {
	if a.preview || a.saving {
		return
	}
	cfg := a.cfg
	token := a.token
	if connection {
		cfg.Endpoint = strings.TrimSpace(a.endpoint.Text)
		token = strings.TrimSpace(a.tokenEntry.Text)
		cfg.Music = a.music.Checked
		cfg.Autostart = a.autostart.Checked
		cfg.Locale = "zh-CN"
		if a.locale.Selected == a.t.Text("enName") {
			cfg.Locale = "en"
		}
		cfg.Interval, _ = strconv.Atoi(a.interval.Selected)
	}
	if e := cfg.Validate(); e != nil {
		dialog.ShowInformation(a.t.Text("error"), a.t.Text(e.Error()), a.win)
		return
	}
	if connection && (len(token) < 32 || len(token) > 512) {
		dialog.ShowInformation(a.t.Text("error"), a.t.Text("invalidConnection"), a.win)
		return
	}
	if a.save != nil {
		a.save.Disable()
	}
	oldLocale := a.cfg.Locale
	oldEndpoint, oldToken := a.cfg.Endpoint, a.token
	cfg.Rules = append([]config.Rule{}, cfg.Rules...)
	a.saving = true
	progress := dialog.NewCustomWithoutButtons(a.t.Text("saving"), widget.NewProgressBarInfinite(), a.win)
	progress.Show()
	go func() {
		var e error
		if token != oldToken || cfg.Endpoint != oldEndpoint {
			if platform.SaveToken(cfg.Endpoint, token) != nil {
				e = errors.New("credentialError")
			}
		}
		previous, _ := config.Load(a.dir)
		if e == nil && cfg.Autostart != previous.Autostart {
			if platform.Autostart(cfg.Autostart) != nil {
				e = errors.New("autostartError")
			}
		}
		if e == nil {
			if cfg.Save(a.dir) != nil {
				e = errors.New("settingsError")
				if cfg.Autostart != previous.Autostart {
					_ = platform.Autostart(previous.Autostart)
				}
			}
		}
		fyne.Do(func() {
			a.saving = false
			progress.Hide()
			if a.save != nil {
				a.save.Enable()
			}
			if e != nil {
				dialog.ShowInformation(a.t.Text("error"), a.t.Text(e.Error()), a.win)
				return
			}
			a.cfg = cfg
			a.token = token
			if a.controller != nil {
				a.controller.Configure(cfg, token)
			}
			message := a.t.Text("saved")
			if oldLocale != cfg.Locale {
				message = a.t.Text("restart")
			}
			dialog.ShowInformation(a.t.Text("saved"), message, a.win)
		})
	}()
}
