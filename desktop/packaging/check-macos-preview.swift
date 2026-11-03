import CoreGraphics
import Foundation

// Window ownership and bounds are available without recording screen pixels.
let pid = Int(CommandLine.arguments[1])!
for _ in 0..<100 {
    let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
    for window in windows {
        if window[kCGWindowOwnerPID as String] as? Int == pid,
           window[kCGWindowLayer as String] as? Int == 0,
           let bounds = window[kCGWindowBounds as String] as? [String: Double],
           (bounds["Width"] ?? 0) >= 560, (bounds["Height"] ?? 0) >= 400 {
            print("Companion preview window appeared on macOS")
            exit(0)
        }
    }
    Thread.sleep(forTimeInterval: 0.2)
}
exit(1)
