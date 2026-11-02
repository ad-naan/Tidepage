// Package protocol is the desktop's bounded JSON-only Socket.IO v4 wire contract.
package protocol

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"
)

type App struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Icon string `json:"icon,omitempty"`
}
type Track struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
	Album  string `json:"album,omitempty"`
	Player string `json:"player"`
}
type Presence struct {
	Status string `json:"status"`
	Apps   []App  `json:"apps"`
	Track  *Track `json:"track"`
}
type Update struct {
	Presence
	Version  int   `json:"version"`
	Sequence int64 `json:"sequence"`
}
type Ack struct {
	OK   bool   `json:"ok"`
	Code string `json:"code,omitempty"`
}

func Empty(paused bool) Presence {
	s := "online"
	if paused {
		s = "paused"
	}
	return Presence{Status: s, Apps: []App{}}
}
func Handshake(token string) string {
	data, _ := json.Marshal(map[string]any{"version": 1, "role": "author", "token": token})
	return "40" + string(data)
}
func Event(id int64, p Presence) (string, error) {
	if p.Apps == nil {
		p.Apps = []App{}
	}
	data, e := json.Marshal([]any{"author:update", Update{Presence: p, Version: 1, Sequence: id}})
	if e != nil {
		return "", e
	}
	if len(data) > 300000 {
		return "", errors.New("invalidPayload")
	}
	return "42" + strconv.FormatInt(id, 10) + string(data), nil
}
func ParseAck(packet string) (int64, Ack, error) {
	var a Ack
	if !strings.HasPrefix(packet, "43") {
		return 0, a, errors.New("not ack")
	}
	b := strings.IndexByte(packet, '[')
	if b < 3 {
		return 0, a, errors.New("invalid ack")
	}
	id, e := strconv.ParseInt(packet[2:b], 10, 64)
	if e != nil {
		return 0, a, e
	}
	var values []Ack
	e = json.Unmarshal([]byte(packet[b:]), &values)
	if e != nil || len(values) != 1 {
		return 0, a, errors.New("invalid ack body")
	}
	return id, values[0], nil
}
