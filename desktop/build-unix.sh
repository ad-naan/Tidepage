#!/bin/sh
set -eu
cd "$(dirname "$0")"
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
mkdir -p dist
case "$(uname -s)" in
    Darwin)
        app="$stage/Tidepage Companion.app"
        mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" "$stage/tide.iconset"
        for arch in arm64 amd64; do
            CGO_ENABLED=1 GOARCH="$arch" go build -trimpath -ldflags '-s -w' -o "$stage/companion-$arch" ./cmd/companion
        done
        lipo -create "$stage/companion-arm64" "$stage/companion-amd64" -output "$app/Contents/MacOS/tidepage-companion"
        lipo "$app/Contents/MacOS/tidepage-companion" -verify_arch arm64 x86_64
        cp packaging/Info.plist "$app/Contents/Info.plist"
        cp internal/ui/assets/OFL.txt "$app/Contents/Resources/OFL.txt"
        for locale in en zh-CN; do
            language=$locale
            if [ "$locale" = zh-CN ]; then language=zh-Hans; fi
            resources="$app/Contents/Resources/$language.lproj"
            mkdir -p "$resources"
            purpose=$(plutil -extract musicAutomation raw -o - "internal/i18n/locales/$locale.json")
            plutil -create xml1 "$resources/InfoPlist.strings"
            plutil -insert NSAppleEventsUsageDescription -string "$purpose" "$resources/InfoPlist.strings"
            if [ "$locale" = en ]; then
                plutil -insert NSAppleEventsUsageDescription -string "$purpose" "$app/Contents/Info.plist"
            fi
        done
        plutil -lint "$app/Contents/Info.plist"
        for size in 16 32 128 256 512; do
            sips -z "$size" "$size" internal/tray/assets/tide.png --out "$stage/tide.iconset/icon_${size}x${size}.png" >/dev/null
            double=$((size * 2))
            sips -z "$double" "$double" internal/tray/assets/tide.png --out "$stage/tide.iconset/icon_${size}x${size}@2x.png" >/dev/null
        done
        iconutil -c icns "$stage/tide.iconset" -o "$app/Contents/Resources/tide.icns"
        codesign --force --sign - "$app"
        codesign --verify --strict "$app"
        ditto -c -k --keepParent "$app" dist/TidepageCompanion-macOS.zip
        ;;
    Linux)
        mkdir -p "$stage/bin" "$stage/share/applications" "$stage/share/pixmaps" "$stage/share/doc/tidepage-companion"
        go build -trimpath -ldflags '-s -w' -o "$stage/bin/tidepage-companion" ./cmd/companion
        cp packaging/TidepageCompanion.desktop "$stage/share/applications/blog.tidepage.companion.desktop"
        cp internal/tray/assets/tide.png "$stage/share/pixmaps/blog.tidepage.companion.png"
        cp internal/ui/assets/OFL.txt "$stage/share/doc/tidepage-companion/OFL.txt"
        tar -czf dist/TidepageCompanion-Linux.tar.gz -C "$stage" bin share
        ;;
    *) echo "Build on macOS or Linux." >&2; exit 1 ;;
esac
