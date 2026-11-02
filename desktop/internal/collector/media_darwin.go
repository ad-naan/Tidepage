package collector

import (
	"context"
	"encoding/json"
	"os/exec"
	"tidepage.local/companion/internal/protocol"
)

// Only public Apple Events are used; macOS may ask for Music/Spotify automation
// permission. Never use the private MediaRemote framework or inspect browser tabs.
func nowPlaying(ctx context.Context) (*protocol.Track, error) {
	script := `var result=null; for (var n of ['Spotify','Music']) { var p=Application(n); if(p.running() && p.playerState()==='playing') {var t=p.currentTrack(); result={title:t.name(),artist:t.artist(),album:t.album(),player:n};break;} } JSON.stringify(result);`
	data, e := exec.CommandContext(ctx, "/usr/bin/osascript", "-l", "JavaScript", "-e", script).Output()
	if e != nil {
		return nil, e
	}
	var track *protocol.Track
	if e = json.Unmarshal(data, &track); e != nil {
		return nil, e
	}
	if track != nil {
		track.Title = stringLimit(track.Title, 200)
		track.Artist = stringLimit(track.Artist, 200)
		track.Album = stringLimit(track.Album, 200)
	}
	return track, nil
}
