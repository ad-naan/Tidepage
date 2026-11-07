#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
archive=${1:-dist/TidepageCompanion-macOS.zip}
stage=$(mktemp -d)
pid=
cleanup() {
    if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; fi
    rm -rf "$stage"
}
trap cleanup EXIT

ditto -x -k "$archive" "$stage"
app="$stage/Tidepage Companion.app"
exe="$app/Contents/MacOS/tidepage-companion"
plutil -lint "$app/Contents/Info.plist"
codesign --verify --strict "$app"
lipo "$exe" -verify_arch arm64 x86_64
version=$(plutil -extract CFBundleShortVersionString raw -o - "$app/Contents/Info.plist")
test "$("$exe" --version)" = "Tidepage Companion $version"

# Compile separately: a broken probe must fail, never masquerade as missing GPU.
swiftc packaging/check-macos-opengl.swift -o "$stage/check-opengl"
status=0
"$stage/check-opengl" || status=$?
case "$status" in
    0) ;;
    78)
        message="macOS package, signature, architectures and version verified. Native preview NOT VERIFIED: this host has no accelerated NSGL context. Run REQUIRE_MACOS_GUI=1 sh packaging/check-macos-package.sh on a graphical Mac before desktop release."
        echo "::warning::$message"
        if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
            printf '%s\n' "$message" >> "$GITHUB_STEP_SUMMARY"
        fi
        if [ "${REQUIRE_MACOS_GUI:-0}" = 1 ]; then exit 1; fi
        exit 0
        ;;
    *) exit "$status" ;;
esac

"$exe" --preview > "$stage/preview.log" 2>&1 &
pid=$!
if ! swift packaging/check-macos-preview.swift "$pid"; then
    cat "$stage/preview.log"
    exit 1
fi
kill -0 "$pid"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
    printf '%s\n' 'macOS package and native preview verified.' >> "$GITHUB_STEP_SUMMARY"
fi
