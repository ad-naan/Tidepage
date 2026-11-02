package companion

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"tidepage.local/companion/internal/collector"
	"tidepage.local/companion/internal/config"
	"tidepage.local/companion/internal/protocol"
	"tidepage.local/companion/internal/realtime"
	"time"
)

type State struct {
	Presence   protocol.Presence
	Connection string
	SyncedAt   time.Time
	Warning    string
	Paused     bool
}
type change struct {
	config config.Config
	token  string
}
type Controller struct {
	ctx            context.Context
	cancel         context.CancelFunc
	done           chan struct{}
	mu             sync.Mutex
	state          State
	observer       func(State)
	changes        chan change
	pauses         chan bool
	client         *realtime.Client
	samplingCancel context.CancelFunc
}

func New(observer func(State)) *Controller {
	ctx, cancel := context.WithCancel(context.Background())
	c := &Controller{ctx: ctx, cancel: cancel, done: make(chan struct{}), state: State{Presence: protocol.Empty(false), Connection: "disconnected"}, observer: observer, changes: make(chan change, 1), pauses: make(chan bool, 1)}
	c.client = realtime.New(func(e realtime.Event) {
		c.mu.Lock()
		c.state.Connection = e.State
		if !e.SyncedAt.IsZero() {
			c.state.SyncedAt = e.SyncedAt
		}
		c.mu.Unlock()
		c.notify()
	})
	go c.run()
	return c
}
func (c *Controller) Snapshot() State {
	c.mu.Lock()
	defer c.mu.Unlock()
	s := c.state
	s.Presence.Apps = append([]protocol.App{}, s.Presence.Apps...)
	return s
}
func (c *Controller) notify() {
	if c.observer != nil {
		c.observer(c.Snapshot())
	}
}
func (c *Controller) Configure(cfg config.Config, token string) {
	c.mu.Lock()
	cancel := c.samplingCancel
	c.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	cfg.Rules = append([]config.Rule{}, cfg.Rules...)
	v := change{cfg, token}
	select {
	case c.changes <- v:
	default:
		select {
		case <-c.changes:
		default:
		}
		c.changes <- v
	}
}
func (c *Controller) Pause(paused bool) {
	c.mu.Lock()
	cancel := c.samplingCancel
	c.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	select {
	case c.pauses <- paused:
	default:
		select {
		case <-c.pauses:
		default:
		}
		c.pauses <- paused
	}
}
func (c *Controller) Close() { c.cancel(); <-c.done }
func (c *Controller) run() {
	defer close(c.done)
	cfg := config.Default()
	paused := false
	var cancelNetwork context.CancelFunc
	var networkDone chan struct{}
	lastToken := ""
	lastEndpoint := ""
	defer func() {
		if cancelNetwork != nil {
			cancelNetwork()
			<-networkDone
		}
	}()
	sampler := collector.New()
	ticker := time.NewTicker(time.Duration(cfg.Interval) * time.Second)
	defer ticker.Stop()
	sample := func() {
		ctx, cancel := context.WithTimeout(c.ctx, 4*time.Second)
		c.mu.Lock()
		c.samplingCancel = cancel
		c.mu.Unlock()
		result := sampler.Sample(ctx, cfg, paused)
		interrupted := errors.Is(ctx.Err(), context.Canceled)
		cancel()
		c.mu.Lock()
		c.samplingCancel = nil
		if interrupted {
			c.mu.Unlock()
			return
		}
		old, _ := json.Marshal(c.state.Presence)
		next, _ := json.Marshal(result.Presence)
		changed := string(old) != string(next) || c.state.Warning != result.Warning || c.state.Paused != paused
		c.state.Presence = result.Presence
		c.state.Warning = result.Warning
		c.state.Paused = paused
		c.mu.Unlock()
		c.client.Publish(result.Presence)
		if changed {
			c.notify()
		}
	}
	for {
		select {
		case <-c.ctx.Done():
			return
		case update := <-c.changes:
			cfg = update.config
			ticker.Reset(time.Duration(cfg.Interval) * time.Second)
			stopped := false
			if networkDone != nil {
				select {
				case <-networkDone:
					stopped = true
				default:
				}
			}
			if update.token != lastToken || cfg.Endpoint != lastEndpoint || stopped {
				if cancelNetwork != nil {
					cancelNetwork()
					<-networkDone
					cancelNetwork = nil
				}
				lastToken = update.token
				lastEndpoint = cfg.Endpoint
				if len(update.token) >= 32 {
					ctx, cancel := context.WithCancel(c.ctx)
					cancelNetwork = cancel
					networkDone = make(chan struct{})
					go func(endpoint, token string, done chan struct{}) {
						defer close(done)
						c.client.Run(ctx, endpoint, token)
					}(cfg.Endpoint, update.token, networkDone)
				}
			}
			sample()
		case paused = <-c.pauses:
			sample()
		case <-ticker.C:
			sample()
		}
	}
}
