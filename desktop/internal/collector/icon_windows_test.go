package collector

import (
	"bytes"
	"context"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func TestWindowsExecutableIcon(t *testing.T) {
	p := filepath.Join(os.Getenv("SystemRoot"), "System32", "notepad.exe")
	img, e := processIcon(context.Background(), Process{Name: "notepad.exe", Path: p})
	if e != nil {
		t.Fatal(e)
	}
	if img.Bounds().Dx() < 48 || img.Bounds().Dy() < 48 {
		t.Fatal("executable icon must be extracted at transport resolution, not enlarged from the small shell icon")
	}
	var encoded bytes.Buffer
	if e = png.Encode(&encoded, img); e != nil {
		t.Fatal(e)
	}
	if _, _, e = image.Decode(bytes.NewReader(encoded.Bytes())); e != nil {
		t.Fatal(e)
	}
}
