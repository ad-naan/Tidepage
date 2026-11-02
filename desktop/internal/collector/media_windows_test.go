package collector

import (
	"context"
	"golang.org/x/sys/windows"
	"os"
	"testing"
	"time"
	"unsafe"
)

func TestWindowsMediaAPI(t *testing.T) {
	if testing.Short() || os.Getenv("TIDEPAGE_NATIVE_TESTS") != "1" {
		t.Skip("native Windows integration")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_, e := nowPlaying(ctx)
	if e != nil {
		t.Fatalf("system media API failed: %v", e)
	}
}

func TestWindowsHString(t *testing.T) {
	text := "Tidepage 中文"
	value, _ := windows.UTF16FromString(text)
	var handle uintptr
	result, _, _ := createHString.Call(uintptr(unsafe.Pointer(&value[0])), uintptr(len(value)-1), uintptr(unsafe.Pointer(&handle)))
	if int32(result) < 0 {
		t.Fatal("HSTRING creation failed")
	}
	defer deleteHString.Call(handle)
	if hStringText(handle) != text {
		t.Fatal("HSTRING conversion failed")
	}
}
