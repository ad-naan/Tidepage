// Package localipc connects the optional GUI to the small tray host on loopback.
// The host is authoritative; the GUI never creates a second collector or socket.
package localipc

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"tidepage.local/companion/internal/companion"
	"tidepage.local/companion/internal/config"
	"time"
)

type address struct{ URL, Secret string }
type configuration struct {
	Config config.Config
	Token  string
}
type Server struct {
	server *http.Server
	path   string
}

func Serve(dir string, controller *companion.Controller, show func()) (*Server, error) {
	listener, e := net.Listen("tcp4", "127.0.0.1:0")
	if e != nil {
		return nil, e
	}
	var random [32]byte
	if _, e = rand.Read(random[:]); e != nil {
		listener.Close()
		return nil, e
	}
	a := address{URL: "http://" + listener.Addr().String(), Secret: hex.EncodeToString(random[:])}
	path := filepath.Join(dir, "runtime.json")
	data, _ := json.Marshal(a)
	if e = os.WriteFile(path, data, 0600); e != nil {
		listener.Close()
		return nil, e
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /state", func(w http.ResponseWriter, r *http.Request) { _ = json.NewEncoder(w).Encode(controller.Snapshot()) })
	mux.HandleFunc("POST /pause", func(w http.ResponseWriter, r *http.Request) {
		var value struct{ Paused bool }
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024)).Decode(&value) != nil {
			http.Error(w, "invalid request", 400)
			return
		}
		controller.Pause(value.Paused)
		w.WriteHeader(204)
	})
	mux.HandleFunc("POST /configure", func(w http.ResponseWriter, r *http.Request) {
		var value configuration
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 100000)).Decode(&value) != nil || value.Config.Validate() != nil || (value.Token != "" && (len(value.Token) < 32 || len(value.Token) > 512)) {
			http.Error(w, "invalid request", 400)
			return
		}
		controller.Configure(value.Config, value.Token)
		w.WriteHeader(204)
	})
	mux.HandleFunc("POST /show", func(w http.ResponseWriter, r *http.Request) { go show(); w.WriteHeader(204) })
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Type", "application/json")
		if r.Header.Get("Origin") != "" || subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+a.Secret)) != 1 {
			http.Error(w, "unauthorized", 401)
			return
		}
		mux.ServeHTTP(w, r)
	})
	server := &http.Server{Handler: handler, ReadHeaderTimeout: 2 * time.Second, ReadTimeout: 3 * time.Second, WriteTimeout: 3 * time.Second, IdleTimeout: 10 * time.Second, MaxHeaderBytes: 8192}
	go func() { _ = server.Serve(listener) }()
	return &Server{server: server, path: path}, nil
}
func (s *Server) Close() {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	_ = s.server.Shutdown(ctx)
	_ = os.Remove(s.path)
}

type Remote struct {
	address address
	client  *http.Client
	ctx     context.Context
	cancel  context.CancelFunc
	mu      sync.Mutex
	state   companion.State
	observe func(companion.State)
}

func Connect(dir string, observe func(companion.State)) (*Remote, error) {
	data, e := os.ReadFile(filepath.Join(dir, "runtime.json"))
	if e != nil {
		return nil, e
	}
	var a address
	if e = json.Unmarshal(data, &a); e != nil {
		return nil, e
	}
	// Runtime files are never allowed to redirect credentials to a remote host.
	if !strings.HasPrefix(a.URL, "http://127.0.0.1:") {
		return nil, errors.New("invalid local endpoint")
	}
	host, _, e := net.SplitHostPort(strings.TrimPrefix(a.URL, "http://"))
	if e != nil || host != "127.0.0.1" || len(a.Secret) != 64 {
		return nil, errors.New("invalid local endpoint")
	}
	ctx, cancel := context.WithCancel(context.Background())
	r := &Remote{address: a, client: &http.Client{Timeout: 2 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return errors.New("redirect refused") }}, ctx: ctx, cancel: cancel, observe: observe}
	if e = r.refresh(); e != nil {
		cancel()
		return nil, e
	}
	go func() {
		ticker := time.NewTicker(time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if r.refresh() != nil {
					r.mu.Lock()
					r.state.Connection = "disconnected"
					r.state.Warning = "hostUnavailable"
					s := r.state
					r.mu.Unlock()
					if r.observe != nil {
						r.observe(s)
					}
				}
			}
		}
	}()
	return r, nil
}
func (r *Remote) request(method, path string, value any, out any) error {
	var body io.Reader
	if value != nil {
		data, e := json.Marshal(value)
		if e != nil {
			return e
		}
		body = bytes.NewReader(data)
	}
	req, e := http.NewRequestWithContext(r.ctx, method, r.address.URL+path, body)
	if e != nil {
		return e
	}
	req.Header.Set("Authorization", "Bearer "+r.address.Secret)
	req.Header.Set("Content-Type", "application/json")
	response, e := r.client.Do(req)
	if e != nil {
		return e
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return errors.New("local request failed")
	}
	if out != nil {
		return json.NewDecoder(io.LimitReader(response.Body, 350000)).Decode(out)
	}
	return nil
}
func (r *Remote) refresh() error {
	var s companion.State
	if e := r.request("GET", "/state", nil, &s); e != nil {
		return e
	}
	r.mu.Lock()
	before, _ := json.Marshal(r.state)
	after, _ := json.Marshal(s)
	changed := !bytes.Equal(before, after)
	r.state = s
	r.mu.Unlock()
	if changed && r.observe != nil {
		r.observe(s)
	}
	return nil
}
func (r *Remote) Snapshot() companion.State { r.mu.Lock(); defer r.mu.Unlock(); return r.state }
func (r *Remote) Configure(c config.Config, token string) {
	go func() { _ = r.request("POST", "/configure", configuration{c, token}, nil); _ = r.refresh() }()
}
func (r *Remote) Pause(paused bool) {
	go func() { _ = r.request("POST", "/pause", struct{ Paused bool }{paused}, nil); _ = r.refresh() }()
}
func (r *Remote) Show() error { return r.request("POST", "/show", struct{}{}, nil) }
func (r *Remote) Close()      { r.cancel(); r.client.CloseIdleConnections() }
