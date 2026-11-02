package collector

import (
	"context"
	"errors"
	"golang.org/x/sys/windows"
	"image"
	"unsafe"
)

var shell, user, gdi = windows.NewLazySystemDLL("shell32.dll"), windows.NewLazySystemDLL("user32.dll"), windows.NewLazySystemDLL("gdi32.dll")

type shellFileInfo struct {
	Icon       uintptr
	Index      int32
	Attributes uint32
	Name       [260]uint16
	Type       [80]uint16
}
type iconInfo struct {
	IsIcon      uint32
	X, Y        uint32
	Mask, Color uintptr
}
type bitmapInfo struct {
	Size                        uint32
	Width, Height               int32
	Planes, BitCount            uint16
	Compression, SizeImage      uint32
	XPels, YPels                int32
	ColorsUsed, ColorsImportant uint32
	Colors                      [4]byte
}

func processIcon(_ context.Context, p Process) (image.Image, error) {
	path, e := windows.UTF16PtrFromString(p.Path)
	if e != nil || p.Path == "" {
		return nil, errors.New("no executable")
	}
	var info shellFileInfo
	result, _, _ := shell.NewProc("SHGetFileInfoW").Call(uintptr(unsafe.Pointer(path)), 0, uintptr(unsafe.Pointer(&info)), unsafe.Sizeof(info), 0x101)
	if result == 0 || info.Icon == 0 {
		return nil, errors.New("no icon")
	}
	defer user.NewProc("DestroyIcon").Call(info.Icon)
	var icon iconInfo
	result, _, _ = user.NewProc("GetIconInfo").Call(info.Icon, uintptr(unsafe.Pointer(&icon)))
	if result == 0 {
		return nil, errors.New("icon unavailable")
	}
	if icon.Mask != 0 {
		defer gdi.NewProc("DeleteObject").Call(icon.Mask)
	}
	if icon.Color == 0 {
		return nil, errors.New("no color icon")
	}
	defer gdi.NewProc("DeleteObject").Call(icon.Color)
	dc, _, _ := gdi.NewProc("CreateCompatibleDC").Call(0)
	if dc == 0 {
		return nil, errors.New("no DC")
	}
	defer gdi.NewProc("DeleteDC").Call(dc)
	bi := bitmapInfo{Size: 40}
	getDIBits := gdi.NewProc("GetDIBits")
	result, _, _ = getDIBits.Call(dc, icon.Color, 0, 0, 0, uintptr(unsafe.Pointer(&bi)), 0)
	if result == 0 || bi.Width < 1 || bi.Width > 256 || bi.Height < 1 || bi.Height > 256 {
		return nil, errors.New("invalid bitmap")
	}
	width, height := int(bi.Width), int(bi.Height)
	bi.Height = -bi.Height
	bi.Planes = 1
	bi.BitCount = 32
	bi.Compression = 0
	pixels := make([]byte, width*height*4)
	result, _, _ = getDIBits.Call(dc, icon.Color, 0, uintptr(height), uintptr(unsafe.Pointer(&pixels[0])), uintptr(unsafe.Pointer(&bi)), 0)
	if result == 0 {
		return nil, errors.New("icon read failed")
	}
	hasAlpha := false
	for i := 3; i < len(pixels); i += 4 {
		hasAlpha = hasAlpha || pixels[i] != 0
	}
	out := image.NewNRGBA(image.Rect(0, 0, width, height))
	for i := 0; i < len(pixels); i += 4 {
		out.Pix[i] = pixels[i+2]
		out.Pix[i+1] = pixels[i+1]
		out.Pix[i+2] = pixels[i]
		out.Pix[i+3] = pixels[i+3]
		if !hasAlpha {
			out.Pix[i+3] = 255
		}
	}
	return out, nil
}
