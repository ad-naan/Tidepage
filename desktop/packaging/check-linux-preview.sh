#!/bin/sh
set -eu
binary=$1
platform=$2
scratch=$(mktemp -d)
preview_pid=
weston_pid=
wm_pid=
cleanup() {
    if [ -n "$preview_pid" ]; then kill "$preview_pid" 2>/dev/null || true; fi
    if [ -n "$weston_pid" ]; then kill "$weston_pid" 2>/dev/null || true; fi
    if [ -n "$wm_pid" ]; then kill "$wm_pid" 2>/dev/null || true; fi
    rm -rf "$scratch"
}
trap cleanup EXIT
export XDG_CONFIG_HOME="$scratch/config" FYNE_PLATFORM="$platform" LIBGL_ALWAYS_SOFTWARE=1
if [ "$platform" = x11 ]; then
    openbox >"$scratch/wm.log" 2>&1 &
    wm_pid=$!
    for i in $(seq 1 100); do
        wmctrl -m >/dev/null 2>&1 && break
        if ! kill -0 "$wm_pid"; then cat "$scratch/wm.log"; exit 1; fi
        sleep 0.1
    done
    wmctrl -m
else
    export XDG_RUNTIME_DIR="$scratch" WAYLAND_DISPLAY=tidepage-smoke
    # A nested Weston gets a real input seat from Xvfb. The application itself
    # sees only Wayland so it cannot silently fall back to an X11 window.
    weston --backend=x11-backend.so --socket="$WAYLAND_DISPLAY" --idle-time=0 >"$scratch/weston.log" 2>&1 &
    weston_pid=$!
    for i in $(seq 1 100); do
        [ -S "$scratch/$WAYLAND_DISPLAY" ] && break
        if ! kill -0 "$weston_pid"; then cat "$scratch/weston.log"; exit 1; fi
        sleep 0.1
    done
    unset DISPLAY
    export WAYLAND_DEBUG=client
fi
"$binary" --preview >"$scratch/preview.log" 2>&1 &
preview_pid=$!
for i in $(seq 1 150); do
    kill -0 "$preview_pid" 2>/dev/null || break
    if [ "$platform" = x11 ]; then
        if window=$(xdotool search --all --onlyvisible --pid "$preview_pid" --name 'Companion'); then
            timeout 5 xdotool windowsize --sync "$window" 700 500
            geometry=$(xdotool getwindowgeometry --shell "$window")
            echo "$geometry" | grep -qx WIDTH=700
            echo "$geometry" | grep -qx HEIGHT=500
            wmctrl -ic "$window"
            for j in $(seq 1 50); do
                if ! kill -0 "$preview_pid" 2>/dev/null; then wait "$preview_pid"; preview_pid=; exit 0; fi
                sleep 0.1
            done
            break
        fi
    elif awk '
        /\.get_xdg_surface\(/ && match($0, /wl_surface[@#][0-9]+/) {
            surface = substr($0, RSTART, RLENGTH)
        }
        /xdg_toplevel.*\.set_title\(.*Companion/ { titled = 1 }
        surface && index($0, surface ".attach(wl_buffer") { attached = 1 }
        attached && index($0, surface ".commit(") { drawn = 1 }
        END { exit !(titled && drawn) }
    ' "$scratch/preview.log"; then
        exit 0
    fi
    sleep 0.2
done
if [ -f "$scratch/weston.log" ]; then tail -30 "$scratch/weston.log"; fi
grep -Ei -B 3 -A 8 'error|failed|fatal|panic|SIGSEGV' "$scratch/preview.log" | tail -80 || true
tail -15 "$scratch/preview.log"
exit 1
