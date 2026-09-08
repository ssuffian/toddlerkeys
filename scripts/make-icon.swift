import AppKit
import Foundation

// Reproducible app icon, drawn locally without fonts or external artwork.
let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let output = root.appendingPathComponent("assets/AppIcon.iconset")
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
func color(_ hex: UInt32) -> NSColor {
    NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255,
            green: CGFloat((hex >> 8) & 255) / 255,
            blue: CGFloat(hex & 255) / 255, alpha: 1)
}
func rounded(_ rect: NSRect, _ radius: CGFloat, _ hex: UInt32) {
    color(hex).setFill()
    NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius).fill()
}
func render(_ pixels: Int, _ name: String) throws {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels,
        pixelsHigh: pixels, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
        isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let transform = NSAffineTransform()
    transform.scale(by: CGFloat(pixels) / 1024)
    transform.concat()
    rounded(NSRect(x: 48, y: 48, width: 928, height: 928), 210, 0xf5f0e6)
    rounded(NSRect(x: 192, y: 162, width: 640, height: 632), 148, 0xc65a43)
    rounded(NSRect(x: 192, y: 230, width: 640, height: 620), 148, 0xf07d60)
    // A lowercase t assembled from rounded geometry for crisp small sizes.
    rounded(NSRect(x: 440, y: 328, width: 110, height: 406), 24, 0xfff8e9)
    rounded(NSRect(x: 358, y: 550, width: 300, height: 100), 24, 0xfff8e9)
    rounded(NSRect(x: 450, y: 308, width: 210, height: 102), 36, 0xfff8e9)
    color(0xe1b749).setFill()
    NSBezierPath(ovalIn: NSRect(x: 705, y: 710, width: 152, height: 152)).fill()
    color(0x548b77).setFill()
    NSBezierPath(ovalIn: NSRect(x: 196, y: 179, width: 104, height: 104)).fill()
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: output.appendingPathComponent(name))
}
for size in [16, 32, 128, 256, 512] {
    try render(size, "icon_\(size)x\(size).png")
    try render(size * 2, "icon_\(size)x\(size)@2x.png")
}
print(output.path)
