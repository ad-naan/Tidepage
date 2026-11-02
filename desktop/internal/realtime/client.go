// Package realtime implements a small, tested Socket.IO v4 / Engine.IO v4 client.
// Supported: default namespace, JSON, WebSocket, auth, ping/pong and acknowledgments.
// Browser and future business modules use the official JavaScript Socket.IO client.
package realtime

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/coder/websocket"
	"math/rand/v2"
	"net/http"
	"net/url"
	"strings"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/protocol"
	"time"
)

type Event struct {
	State    string
	SyncedAt time.Time
}
type Client struct {
	updates chan protocol.Presence
	events  func(Event)
}

func New(events func(Event)) *Client {
	return &Client{updates: make(chan protocol.Presence, 1), events: events}
}
func (c *Client) Publish(p protocol.Presence) {
	select {
	case c.updates <- p:
	default:
		select {
		case <-c.updates:
		default:
		}
		select {
		case c.updates <- p:
		default:
		}
	}
}
func (c *Client) emit(state string) {
	if c.events != nil {
		c.events(Event{State: state})
	}
}
func (c *Client) Run(ctx context.Context, endpoint, token string) {
	if !config.ValidEndpoint(endpoint) || len(token) < 32 || len(token) > 512 {
		c.emit("invalidConnection")
		return
	}
	u, _ := url.Parse(endpoint)
	if u.Scheme == "https" {
		u.Scheme = "wss"
	} else {
		u.Scheme = "ws"
	}
	u.Path = "/socket.io/"
	u.RawQuery = "EIO=4&transport=websocket"
	latest := protocol.Empty(false)
	for attempt := 0; ctx.Err() == nil; attempt++ {
		c.emit("connecting")
		dialCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
		conn, _, err := websocket.Dial(dialCtx, u.String(), &websocket.DialOptions{HTTPClient: &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}})
		cancel()
		ready := false
		if err == nil {
			conn.SetReadLimit(350000)
			ready, err = c.session(ctx, conn, token, &latest)
			conn.CloseNow()
		}
		if ctx.Err() != nil {
			break
		}
		if errors.Is(err, errAuth) {
			c.emit("authFailed")
			return
		}
		if errors.Is(err, errSuperseded) {
			c.emit("superseded")
			return
		}
		if errors.Is(err, errPayload) {
			c.emit("invalidPayload")
			return
		}
		if ready {
			attempt = 0
		}
		c.emit("reconnecting")
		cap := min(30*time.Second, 500*time.Millisecond*time.Duration(1<<min(attempt, 6)))
		timer := time.NewTimer(cap/2 + time.Duration(rand.Int64N(int64(cap/2))))
	wait:
		for {
			select {
			case <-ctx.Done():
				timer.Stop()
				c.emit("disconnected")
				return
			case p := <-c.updates:
				latest = p
			case <-timer.C:
				break wait
			}
		}
	}
	c.emit("disconnected")
}

var errAuth, errSuperseded, errPayload = errors.New("auth"), errors.New("superseded"), errors.New("payload")

type incoming struct {
	packet string
	err    error
}

func (c *Client) session(ctx context.Context, conn *websocket.Conn, token string, latest *protocol.Presence) (bool, error) {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	packets := make(chan incoming, 8)
	go func() {
		defer close(packets)
		for {
			typ, data, e := conn.Read(ctx)
			if e != nil {
				select {
				case packets <- incoming{err: e}:
				case <-ctx.Done():
				}
				return
			}
			if typ != websocket.MessageText {
				continue
			}
			select {
			case packets <- incoming{packet: string(data)}:
			case <-ctx.Done():
				return
			}
		}
	}()
	write := func(packet string) error {
		deadline, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		return conn.Write(deadline, websocket.MessageText, []byte(packet))
	}
	watchdog := time.NewTimer(15 * time.Second)
	defer watchdog.Stop()
	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()
	ackTimer := time.NewTimer(time.Hour)
	ackTimer.Stop()
	defer ackTimer.Stop()
	reset := func(t *time.Timer, d time.Duration) {
		if !t.Stop() {
			select {
			case <-t.C:
			default:
			}
		}
		t.Reset(d)
	}
	ready, pending := false, false
	var sequence int64
	var packet string
	retries := 0
	deadline := 45 * time.Second
	send := func() error {
		if !ready {
			return nil
		}
		sequence++
		var e error
		packet, e = protocol.Event(sequence, *latest)
		if e != nil {
			return errPayload
		}
		if e = write(packet); e != nil {
			return e
		}
		pending = true
		retries = 0
		reset(ackTimer, 7*time.Second)
		return nil
	}
	for {
		select {
		case <-ctx.Done():
			return ready, ctx.Err()
		case <-watchdog.C:
			return ready, errors.New("heartbeat timeout")
		case p := <-c.updates:
			before, _ := json.Marshal(latest)
			after, _ := json.Marshal(p)
			*latest = p
			if string(before) != string(after) {
				if e := send(); e != nil {
					return ready, e
				}
			}
		case <-heartbeat.C:
			if !pending {
				if e := send(); e != nil {
					return ready, e
				}
			}
		case <-ackTimer.C:
			if !pending {
				continue
			}
			retries++
			if retries > 2 {
				return ready, errors.New("ack timeout")
			}
			if e := write(packet); e != nil {
				return ready, e
			}
			reset(ackTimer, 7*time.Second)
		case incoming, ok := <-packets:
			if !ok {
				return ready, errors.New("connection closed")
			}
			if incoming.err != nil {
				return ready, incoming.err
			}
			p := incoming.packet
			switch {
			case strings.HasPrefix(p, "0"):
				var hello struct {
					SID          string `json:"sid"`
					PingInterval int    `json:"pingInterval"`
					PingTimeout  int    `json:"pingTimeout"`
				}
				if json.Unmarshal([]byte(p[1:]), &hello) != nil || hello.SID == "" {
					return ready, errors.New("invalid handshake")
				}
				deadline = time.Duration(hello.PingInterval+hello.PingTimeout+5000) * time.Millisecond
				if deadline < 10*time.Second || deadline > 2*time.Minute {
					return ready, errors.New("invalid heartbeat")
				}
				reset(watchdog, deadline)
				if e := write(protocol.Handshake(token)); e != nil {
					return ready, e
				}
			case p == "2":
				if e := write("3"); e != nil {
					return ready, e
				}
				reset(watchdog, deadline)
			case strings.HasPrefix(p, "40"):
				ready = true
				c.emit("connected")
				if e := send(); e != nil {
					return ready, e
				}
			case strings.HasPrefix(p, "44"):
				var failure struct {
					Message string `json:"message"`
				}
				_ = json.Unmarshal([]byte(p[2:]), &failure)
				if failure.Message == "UNAVAILABLE" || failure.Message == "RATE_LIMITED" {
					return ready, errors.New("gateway unavailable")
				}
				return ready, errAuth
			case p == "41" || p == "1":
				return ready, errors.New("server disconnected")
			case strings.HasPrefix(p, "43"):
				id, ack, e := protocol.ParseAck(p)
				if e != nil || !pending || id != sequence {
					continue
				}
				if !ack.OK {
					switch ack.Code {
					case "SUPERSEDED":
						return ready, errSuperseded
					case "INVALID_PAYLOAD":
						return ready, errPayload
					default:
						return ready, errors.New("publish rejected")
					}
				}
				pending = false
				ackTimer.Stop()
				if c.events != nil {
					c.events(Event{State: "connected", SyncedAt: time.Now()})
				}
			}
		}
	}
}
