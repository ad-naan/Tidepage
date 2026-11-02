package protocol

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestWireContract(t *testing.T) {
	packet, e := Event(7, Presence{Status: "online"})
	if e != nil || !strings.HasPrefix(packet, `427["author:update",`) {
		t.Fatalf("invalid packet: %s", packet)
	}
	var payload []json.RawMessage
	if json.Unmarshal([]byte(packet[3:]), &payload) != nil {
		t.Fatal("not JSON")
	}
	var update map[string]any
	_ = json.Unmarshal(payload[1], &update)
	if update["version"] != float64(1) || update["sequence"] != float64(7) {
		t.Fatal("missing version or sequence")
	}
	if string(updateRaw(payload[1], "apps")) != "[]" {
		t.Fatal("nil app list must encode as array")
	}
}
func updateRaw(data []byte, key string) json.RawMessage {
	var fields map[string]json.RawMessage
	_ = json.Unmarshal(data, &fields)
	return fields[key]
}
func TestAckParsing(t *testing.T) {
	id, ack, e := ParseAck(`4312[{"ok":false,"code":"SUPERSEDED"}]`)
	if e != nil || id != 12 || ack.OK || ack.Code != "SUPERSEDED" {
		t.Fatal("bad ack")
	}
	for _, p := range []string{"43", "43x[]", "431{}", "431[]", "431[1]", "42[]"} {
		if _, _, e := ParseAck(p); e == nil {
			t.Fatalf("malformed ack accepted: %s", p)
		}
	}
}
func TestTokenOnlyInHandshake(t *testing.T) {
	secret := "private-device-token"
	packet := Handshake(secret)
	if !strings.HasPrefix(packet, "40{") {
		t.Fatal("invalid connect packet")
	}
	var auth map[string]any
	if json.Unmarshal([]byte(packet[2:]), &auth) != nil || auth["token"] != secret || auth["role"] != "author" {
		t.Fatal("invalid auth")
	}
	event, _ := Event(1, Empty(true))
	if strings.Contains(event, secret) {
		t.Fatal("token leaked into public update")
	}
}
