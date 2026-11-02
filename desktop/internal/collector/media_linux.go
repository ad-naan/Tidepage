package collector

import (
	"context"
	"github.com/godbus/dbus/v5"
	"strings"
	"tidepage.local/companion/internal/protocol"
)

func nowPlaying(ctx context.Context) (*protocol.Track, error) {
	bus, e := dbus.ConnectSessionBus()
	if e != nil {
		return nil, e
	}
	defer bus.Close()
	var services []string
	if e = bus.BusObject().CallWithContext(ctx, "org.freedesktop.DBus.ListNames", 0).Store(&services); e != nil {
		return nil, e
	}
	checked := 0
	for _, service := range services {
		if !strings.HasPrefix(service, "org.mpris.MediaPlayer2.") {
			continue
		}
		checked++
		if checked > 16 {
			break
		}
		var props map[string]dbus.Variant
		if bus.Object(service, "/org/mpris/MediaPlayer2").CallWithContext(ctx, "org.freedesktop.DBus.Properties.GetAll", 0, "org.mpris.MediaPlayer2.Player").Store(&props) != nil {
			continue
		}
		if props["PlaybackStatus"].Value() != "Playing" {
			continue
		}
		metadata, ok := props["Metadata"].Value().(map[string]dbus.Variant)
		if !ok {
			continue
		}
		title, _ := metadata["xesam:title"].Value().(string)
		if title == "" {
			continue
		}
		artist, _ := metadata["xesam:artist"].Value().([]string)
		album, _ := metadata["xesam:album"].Value().(string)
		return &protocol.Track{Title: stringLimit(title, 200), Artist: stringLimit(strings.Join(artist, ", "), 200), Album: stringLimit(album, 200), Player: stringLimit(strings.TrimPrefix(service, "org.mpris.MediaPlayer2."), 120)}, nil
	}
	return nil, nil
}
