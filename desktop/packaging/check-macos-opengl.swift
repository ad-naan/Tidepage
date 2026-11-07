import AppKit

// GLFW's NSGL backend requires accelerated rendering, even for Fyne's GL 2.1
// context. A software-only macOS VM cannot satisfy this prerequisite.
let attributes: [NSOpenGLPixelFormatAttribute] = [
    UInt32(NSOpenGLPFAAccelerated),
    UInt32(NSOpenGLPFAAllowOfflineRenderers),
    UInt32(NSOpenGLPFADoubleBuffer),
    UInt32(NSOpenGLPFAColorSize), 24,
    UInt32(NSOpenGLPFAAlphaSize), 8,
    UInt32(NSOpenGLPFADepthSize), 24,
    UInt32(NSOpenGLPFAStencilSize), 8,
    0,
]
guard let format = NSOpenGLPixelFormat(attributes: attributes),
      let context = NSOpenGLContext(format: format, share: nil) else {
    print("Accelerated NSGL context unavailable on this host")
    exit(78)
}
context.makeCurrentContext()
NSOpenGLContext.clearCurrentContext()
print("Accelerated NSGL context available")
