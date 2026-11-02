package realtime

import (
	"context"
	"github.com/coder/websocket"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"tidepage.local/companion/internal/protocol"
	"time"
)

func TestReconnectAfterServerDisconnectAndRespondToPing(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	var connections atomic.Int32
	pongs := make(chan struct{}, 2)
	result := make(chan struct{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, e := websocket.Accept(w, r, nil)
		if e != nil {
			return
		}
		defer conn.CloseNow()
		number := connections.Add(1)
		write := func(s string) error { return conn.Write(ctx, websocket.MessageText, []byte(s)) }
		if write(`0{"sid":"test","pingInterval":25000,"pingTimeout":20000}`) != nil {
			return
		}
		_, auth, e := conn.Read(ctx)
		if e != nil || !strings.Contains(string(auth), `"role":"author"`) {
			return
		}
		if write(`40{"sid":"test"}`) != nil {
			return
		}
		for {
			_, data, e := conn.Read(ctx)
			if e != nil {
				return
			}
			packet := string(data)
			if packet == "3" {
				pongs <- struct{}{}
				continue
			}
			if !strings.HasPrefix(packet, "42") {
				continue
			}
			bracket := strings.IndexByte(packet, '[')
			if bracket < 3 {
				return
			}
			if number == 1 {
				_ = write("41")
				return
			}
			if write("43"+packet[2:bracket]+`[{"ok":true}]`) != nil {
				return
			}
			_ = write("2")
			select {
			case result <- struct{}{}:
			default:
			}
		}
	}))
	defer server.Close()
	c := New(nil)
	c.Publish(protocol.Presence{Status: "online", Apps: []protocol.App{{ID: "editor", Name: "Editor"}}})
	done := make(chan struct{})
	go func() { defer close(done); c.Run(ctx, server.URL, strings.Repeat("t", 32)) }()
	select {
	case <-ctx.Done():
		t.Fatal("client failed to reconnect")
	case <-result:
	}
	select {
	case <-ctx.Done():
		t.Fatal("client failed to respond to Engine.IO ping")
	case <-pongs:
	}
	cancel()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("cancellation leaked the connection loop")
	}
	if connections.Load() < 2 {
		t.Fatal("namespace disconnect was treated as permanent failure")
	}
}
func TestAuthenticationFailureDoesNotRetryForever(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	var connections atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		connections.Add(1)
		conn, e := websocket.Accept(w, r, nil)
		if e != nil {
			return
		}
		defer conn.CloseNow()
		_ = conn.Write(ctx, websocket.MessageText, []byte(`0{"sid":"test","pingInterval":25000,"pingTimeout":20000}`))
		_, _, _ = conn.Read(ctx)
		_ = conn.Write(ctx, websocket.MessageText, []byte(`44{"message":"UNAUTHORIZED"}`))
	}))
	defer server.Close()
	state := ""
	c := New(func(e Event) { state = e.State })
	c.Run(ctx, server.URL, strings.Repeat("t", 32))
	if ctx.Err() != nil || state != "authFailed" || connections.Load() != 1 {
		t.Fatal("authentication failure must stop and request user correction")
	}
}
func TestRedirectCannotReceiveDeviceToken(t *testing.T) {
	var received atomic.Bool
	target := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { received.Store(true) }))
	defer target.Close()
	redirect := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusTemporaryRedirect)
	}))
	defer redirect.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	New(nil).Run(ctx, redirect.URL, strings.Repeat("t", 32))
	if received.Load() {
		t.Fatal("followed an unexpected handshake redirect")
	}
}
