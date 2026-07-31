import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

enum FaviconError: Error, CustomStringConvertible {
    case cannotLoad(String)
    case cannotCreateContext(Int, Int)
    case cannotCreateImage
    case cannotWrite(String)
    case verificationFailed(String)

    var description: String {
        switch self {
        case .cannotLoad(let path):
            return "Cannot load image: \(path)"
        case .cannotCreateContext(let width, let height):
            return "Cannot create RGBA context: \(width)x\(height)"
        case .cannotCreateImage:
            return "Cannot create CGImage"
        case .cannotWrite(let path):
            return "Cannot write image: \(path)"
        case .verificationFailed(let message):
            return "Pixel verification failed: \(message)"
        }
    }
}

struct PixelStats {
    let width: Int
    let height: Int
    let cornerAlphas: [UInt8]
    let maxOuterBandAlpha: UInt8
    let outerBandVisiblePixels: Int
    let transparentPixels: Int
    let visiblePixels: Int
    let nearWhiteSilhouetteEdgePixels: Int
}

extension Data {
    mutating func appendLittleEndian<T: FixedWidthInteger>(_ value: T) {
        var littleEndianValue = value.littleEndian
        Swift.withUnsafeBytes(of: &littleEndianValue) { buffer in
            append(contentsOf: buffer)
        }
    }
}

let fileManager = FileManager.default
let workingDirectory = URL(fileURLWithPath: fileManager.currentDirectoryPath)
let sourceURL = workingDirectory.appendingPathComponent("public/brand/toto-tad-face.png")
let iconURL = workingDirectory.appendingPathComponent("app/icon.png")
let appleIconURL = workingDirectory.appendingPathComponent("app/apple-icon.png")
let faviconURL = workingDirectory.appendingPathComponent("app/favicon.ico")
let publicFaviconURL = workingDirectory.appendingPathComponent("public/favicon.ico")
let previewDirectory = URL(fileURLWithPath: "/private/tmp")
let frameSizes = [16, 32, 48]

func loadImage(_ url: URL, index: Int = 0) throws -> CGImage {
    guard
        let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        index < CGImageSourceGetCount(source),
        let image = CGImageSourceCreateImageAtIndex(source, index, nil)
    else {
        throw FaviconError.cannotLoad(url.path)
    }
    return image
}

func imageCount(_ url: URL) -> Int {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
        return 0
    }
    return CGImageSourceGetCount(source)
}

func makeRGBAContext(width: Int, height: Int) throws -> CGContext {
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let alphaInfo = CGImageAlphaInfo.premultipliedLast
    let bitmapInfo = CGBitmapInfo.byteOrder32Big.union(
        CGBitmapInfo(rawValue: alphaInfo.rawValue)
    )

    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo.rawValue
    ) else {
        throw FaviconError.cannotCreateContext(width, height)
    }

    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    context.setAllowsAntialiasing(true)
    context.setShouldAntialias(true)
    return context
}

func drawTopLeft(
    context: CGContext,
    image: CGImage,
    rect: CGRect,
    canvasHeight _: Int,
    interpolation: CGInterpolationQuality
) {
    context.saveGState()
    context.interpolationQuality = interpolation
    context.draw(image, in: rect)
    context.restoreGState()
}

func makeTransparentIcon(from source: CGImage) throws -> CGImage {
    let width = source.width
    let height = source.height
    let sourcePixels = try pixelBytes(for: source)
    var outputPixels = sourcePixels
    var backgroundRed = 0
    var backgroundGreen = 0
    var backgroundBlue = 0
    var sampleCount = 0
    let sampleSize = min(8, min(width, height))

    for y in 0..<height {
        for x in 0..<width {
            let isCornerSample =
                (x < sampleSize || x >= width - sampleSize) &&
                (y < sampleSize || y >= height - sampleSize)
            guard isCornerSample else {
                continue
            }

            let offset = (y * width + x) * 4
            backgroundRed += Int(sourcePixels[offset])
            backgroundGreen += Int(sourcePixels[offset + 1])
            backgroundBlue += Int(sourcePixels[offset + 2])
            sampleCount += 1
        }
    }

    backgroundRed /= sampleCount
    backgroundGreen /= sampleCount
    backgroundBlue /= sampleCount

    let floodTolerance = 12
    let floodToleranceSquared = floodTolerance * floodTolerance
    let antialiasSolidDistance = 34.0
    var isBackground = Array(repeating: false, count: width * height)
    var queue: [Int] = []
    queue.reserveCapacity(width * height)

    func isBackgroundCandidate(_ pixelIndex: Int) -> Bool {
        let offset = pixelIndex * 4
        let redDelta = Int(sourcePixels[offset]) - backgroundRed
        let greenDelta = Int(sourcePixels[offset + 1]) - backgroundGreen
        let blueDelta = Int(sourcePixels[offset + 2]) - backgroundBlue
        let distanceSquared =
            (redDelta * redDelta) +
            (greenDelta * greenDelta) +
            (blueDelta * blueDelta)
        return distanceSquared <= floodToleranceSquared
    }

    func enqueueBackground(x: Int, y: Int) {
        let pixelIndex = (y * width) + x
        guard
            !isBackground[pixelIndex],
            isBackgroundCandidate(pixelIndex)
        else {
            return
        }
        isBackground[pixelIndex] = true
        queue.append(pixelIndex)
    }

    for x in 0..<width {
        enqueueBackground(x: x, y: 0)
        enqueueBackground(x: x, y: height - 1)
    }
    for y in 0..<height {
        enqueueBackground(x: 0, y: y)
        enqueueBackground(x: width - 1, y: y)
    }

    var queueIndex = 0
    while queueIndex < queue.count {
        let pixelIndex = queue[queueIndex]
        queueIndex += 1
        let x = pixelIndex % width
        let y = pixelIndex / width

        if x > 0 {
            enqueueBackground(x: x - 1, y: y)
        }
        if x + 1 < width {
            enqueueBackground(x: x + 1, y: y)
        }
        if y > 0 {
            enqueueBackground(x: x, y: y - 1)
        }
        if y + 1 < height {
            enqueueBackground(x: x, y: y + 1)
        }
    }

    for y in 0..<height {
        for x in 0..<width {
            let pixelIndex = (y * width) + x
            let offset = pixelIndex * 4

            if isBackground[pixelIndex] {
                outputPixels[offset] = 0
                outputPixels[offset + 1] = 0
                outputPixels[offset + 2] = 0
                outputPixels[offset + 3] = 0
                continue
            }

            var touchesBackground = false
            for neighborY in max(0, y - 1)...min(height - 1, y + 1) {
                for neighborX in max(0, x - 1)...min(width - 1, x + 1) {
                    if isBackground[(neighborY * width) + neighborX] {
                        touchesBackground = true
                    }
                }
            }
            guard touchesBackground else {
                continue
            }

            let red = Int(sourcePixels[offset])
            let green = Int(sourcePixels[offset + 1])
            let blue = Int(sourcePixels[offset + 2])
            let redDelta = red - backgroundRed
            let greenDelta = green - backgroundGreen
            let blueDelta = blue - backgroundBlue
            let colorDistance = sqrt(
                Double(
                    (redDelta * redDelta) +
                    (greenDelta * greenDelta) +
                    (blueDelta * blueDelta)
                )
            )
            guard colorDistance < antialiasSolidDistance else {
                continue
            }

            let normalizedAlpha = max(
                0,
                min(
                    1,
                    (colorDistance - Double(floodTolerance)) /
                    (antialiasSolidDistance - Double(floodTolerance))
                )
            )
            let alpha = Int((normalizedAlpha * 255).rounded())
            let inverseAlpha = 255 - alpha
            let premultiplyWithoutMatte: (Int, Int) -> UInt8 = { channel, background in
                let decontaminated = channel - ((background * inverseAlpha) / 255)
                return UInt8(max(0, min(alpha, decontaminated)))
            }

            outputPixels[offset] = premultiplyWithoutMatte(red, backgroundRed)
            outputPixels[offset + 1] = premultiplyWithoutMatte(green, backgroundGreen)
            outputPixels[offset + 2] = premultiplyWithoutMatte(blue, backgroundBlue)
            outputPixels[offset + 3] = UInt8(alpha)
        }
    }

    var visited = Array(repeating: false, count: width * height)
    var largestComponent: [Int] = []

    for startIndex in 0..<(width * height) {
        guard
            !visited[startIndex],
            outputPixels[(startIndex * 4) + 3] > 0
        else {
            continue
        }

        var component: [Int] = []
        var componentQueue = [startIndex]
        var componentQueueIndex = 0
        visited[startIndex] = true

        while componentQueueIndex < componentQueue.count {
            let pixelIndex = componentQueue[componentQueueIndex]
            componentQueueIndex += 1
            component.append(pixelIndex)
            let x = pixelIndex % width
            let y = pixelIndex / width

            let neighbors = [
                (x - 1, y),
                (x + 1, y),
                (x, y - 1),
                (x, y + 1),
            ]
            for (neighborX, neighborY) in neighbors {
                guard
                    neighborX >= 0,
                    neighborX < width,
                    neighborY >= 0,
                    neighborY < height
                else {
                    continue
                }

                let neighborIndex = (neighborY * width) + neighborX
                guard
                    !visited[neighborIndex],
                    outputPixels[(neighborIndex * 4) + 3] > 0
                else {
                    continue
                }

                visited[neighborIndex] = true
                componentQueue.append(neighborIndex)
            }
        }

        if component.count > largestComponent.count {
            largestComponent = component
        }
    }

    var belongsToFace = Array(repeating: false, count: width * height)
    for pixelIndex in largestComponent {
        belongsToFace[pixelIndex] = true
    }
    for pixelIndex in 0..<(width * height) where !belongsToFace[pixelIndex] {
        let offset = pixelIndex * 4
        outputPixels[offset] = 0
        outputPixels[offset + 1] = 0
        outputPixels[offset + 2] = 0
        outputPixels[offset + 3] = 0
    }

    // The source image contains a few bright texture flecks immediately outside
    // the hair. Remove only bright, non-skin boundary pixels; interior face
    // pixels are never candidates for this cleanup.
    var removedBoundaryTexture = true
    while removedBoundaryTexture {
        removedBoundaryTexture = false
        var pixelsToClear: [Int] = []

        for y in 0..<height {
            for x in 0..<width {
                let pixelIndex = (y * width) + x
                let offset = pixelIndex * 4
                let alpha = Int(outputPixels[offset + 3])
                guard alpha > 0 else {
                    continue
                }

                var touchesTransparency = false
                for neighborY in max(0, y - 1)...min(height - 1, y + 1) {
                    for neighborX in max(0, x - 1)...min(width - 1, x + 1) {
                        let neighborIndex = (neighborY * width) + neighborX
                        if outputPixels[(neighborIndex * 4) + 3] == 0 {
                            touchesTransparency = true
                        }
                    }
                }
                guard touchesTransparency else {
                    continue
                }

                let unpremultiply: (UInt8) -> Int = { value in
                    min(
                        255,
                        Int((Double(value) * 255.0 / Double(alpha)).rounded())
                    )
                }
                let red = unpremultiply(outputPixels[offset])
                let green = unpremultiply(outputPixels[offset + 1])
                let blue = unpremultiply(outputPixels[offset + 2])
                let maximumChannel = max(red, green, blue)
                let isUpperHairTexture =
                    y < Int(Double(height) * 0.28) &&
                    (
                        maximumChannel >= 65 ||
                        (
                            maximumChannel >= 35 &&
                            red >= blue + 8 &&
                            green >= blue + 4
                        )
                    )
                let isWarmSkin =
                    y >= Int(Double(height) * 0.28) &&
                    red >= 155 &&
                    green >= 105 &&
                    blue >= 115 &&
                    red > green &&
                    green > blue

                if isUpperHairTexture ||
                    (maximumChannel >= 150 && !isWarmSkin) {
                    pixelsToClear.append(pixelIndex)
                }
            }
        }

        for pixelIndex in pixelsToClear {
            let offset = pixelIndex * 4
            outputPixels[offset] = 0
            outputPixels[offset + 1] = 0
            outputPixels[offset + 2] = 0
            outputPixels[offset + 3] = 0
        }
        removedBoundaryTexture = !pixelsToClear.isEmpty
    }

    // Drop tiny source-texture islands near the top of the hair. A real
    // silhouette edge has a dense local neighborhood; these flecks do not.
    var sparseUpperPixels: [Int] = []
    let upperHairLimit = Int(Double(height) * 0.28)
    for y in 0..<upperHairLimit {
        for x in 0..<width {
            let pixelIndex = (y * width) + x
            guard outputPixels[(pixelIndex * 4) + 3] > 0 else {
                continue
            }

            var solidNeighbors = 0
            for neighborY in max(0, y - 2)...min(height - 1, y + 2) {
                for neighborX in max(0, x - 2)...min(width - 1, x + 2) {
                    let neighborIndex = (neighborY * width) + neighborX
                    if outputPixels[(neighborIndex * 4) + 3] >= 128 {
                        solidNeighbors += 1
                    }
                }
            }
            if solidNeighbors < 6 {
                sparseUpperPixels.append(pixelIndex)
            }
        }
    }
    for pixelIndex in sparseUpperPixels {
        let offset = pixelIndex * 4
        outputPixels[offset] = 0
        outputPixels[offset + 1] = 0
        outputPixels[offset + 2] = 0
        outputPixels[offset + 3] = 0
    }

    // Discard extremely faint residual source texture before downscaling. The
    // threshold only affects the transparent silhouette edge, not face pixels.
    for pixelIndex in 0..<(width * height) {
        let offset = pixelIndex * 4
        if outputPixels[offset + 3] <= 24 {
            outputPixels[offset] = 0
            outputPixels[offset + 1] = 0
            outputPixels[offset + 2] = 0
            outputPixels[offset + 3] = 0
        }
    }

    // Boundary cleanup can sever the last one-pixel bridge to a texture fleck.
    // Retain only the component connected to the center of the actual face.
    let faceSeed = ((height / 2) * width) + (width / 2)
    var connectedToFace = Array(repeating: false, count: width * height)
    var faceQueue = [faceSeed]
    var faceQueueIndex = 0
    connectedToFace[faceSeed] = true

    while faceQueueIndex < faceQueue.count {
        let pixelIndex = faceQueue[faceQueueIndex]
        faceQueueIndex += 1
        let x = pixelIndex % width
        let y = pixelIndex / width
        let neighbors = [
            (x - 1, y),
            (x + 1, y),
            (x, y - 1),
            (x, y + 1),
        ]

        for (neighborX, neighborY) in neighbors {
            guard
                neighborX >= 0,
                neighborX < width,
                neighborY >= 0,
                neighborY < height
            else {
                continue
            }

            let neighborIndex = (neighborY * width) + neighborX
            guard
                !connectedToFace[neighborIndex],
                outputPixels[(neighborIndex * 4) + 3] > 0
            else {
                continue
            }
            connectedToFace[neighborIndex] = true
            faceQueue.append(neighborIndex)
        }
    }

    for pixelIndex in 0..<(width * height) where !connectedToFace[pixelIndex] {
        let offset = pixelIndex * 4
        outputPixels[offset] = 0
        outputPixels[offset + 1] = 0
        outputPixels[offset + 2] = 0
        outputPixels[offset + 3] = 0
    }

    let outputContext = try makeRGBAContext(width: width, height: height)
    guard let destination = outputContext.data else {
        throw FaviconError.cannotCreateImage
    }

    outputPixels.withUnsafeBytes { sourceBuffer in
        guard let sourceAddress = sourceBuffer.baseAddress else {
            return
        }
        destination.copyMemory(
            from: sourceAddress,
            byteCount: outputPixels.count
        )
    }

    guard let image = outputContext.makeImage() else {
        throw FaviconError.cannotCreateImage
    }
    return image
}

func resizePremultiplied(
    _ source: CGImage,
    size: Int,
    transparentInset: Int = 0
) throws -> CGImage {
    let context = try makeRGBAContext(width: size, height: size)
    let inset = max(0, transparentInset)
    let contentSize = size - (inset * 2)
    guard contentSize > 0 else {
        throw FaviconError.cannotCreateContext(size, size)
    }

    drawTopLeft(
        context: context,
        image: source,
        rect: CGRect(
            x: inset,
            y: inset,
            width: contentSize,
            height: contentSize
        ),
        canvasHeight: size,
        interpolation: .high
    )

    if inset >= 2 {
        context.clear(CGRect(x: 0, y: 0, width: size, height: 2))
        context.clear(CGRect(x: 0, y: size - 2, width: size, height: 2))
        context.clear(CGRect(x: 0, y: 0, width: 2, height: size))
        context.clear(CGRect(x: size - 2, y: 0, width: 2, height: size))
    }

    guard let resizedImage = context.makeImage() else {
        throw FaviconError.cannotCreateImage
    }

    var pixels = try pixelBytes(for: resizedImage)
    var removedResizeMatte = true
    while removedResizeMatte {
        removedResizeMatte = false
        var pixelsToClear: [Int] = []

        for y in 0..<size {
            for x in 0..<size {
                let pixelIndex = (y * size) + x
                let offset = pixelIndex * 4
                let alpha = Int(pixels[offset + 3])
                guard alpha > 0 else {
                    continue
                }

                var touchesTransparency = false
                for neighborY in max(0, y - 1)...min(size - 1, y + 1) {
                    for neighborX in max(0, x - 1)...min(size - 1, x + 1) {
                        let neighborIndex = (neighborY * size) + neighborX
                        if pixels[(neighborIndex * 4) + 3] == 0 {
                            touchesTransparency = true
                        }
                    }
                }
                guard touchesTransparency else {
                    continue
                }

                let unpremultiply: (UInt8) -> Int = { value in
                    min(
                        255,
                        Int((Double(value) * 255.0 / Double(alpha)).rounded())
                    )
                }
                let red = unpremultiply(pixels[offset])
                let green = unpremultiply(pixels[offset + 1])
                let blue = unpremultiply(pixels[offset + 2])
                let colorRange =
                    max(red, green, blue) - min(red, green, blue)
                if red >= 240 &&
                    green >= 240 &&
                    blue >= 240 &&
                    colorRange <= 14 {
                    pixelsToClear.append(pixelIndex)
                }
            }
        }

        for pixelIndex in pixelsToClear {
            let offset = pixelIndex * 4
            pixels[offset] = 0
            pixels[offset + 1] = 0
            pixels[offset + 2] = 0
            pixels[offset + 3] = 0
        }
        removedResizeMatte = !pixelsToClear.isEmpty
    }

    let cleanedContext = try makeRGBAContext(width: size, height: size)
    guard let destination = cleanedContext.data else {
        throw FaviconError.cannotCreateImage
    }
    pixels.withUnsafeBytes { sourceBuffer in
        guard let sourceAddress = sourceBuffer.baseAddress else {
            return
        }
        destination.copyMemory(from: sourceAddress, byteCount: pixels.count)
    }
    guard let cleanedImage = cleanedContext.makeImage() else {
        throw FaviconError.cannotCreateImage
    }
    return cleanedImage
}

func pngData(for image: CGImage) throws -> Data {
    let mutableData = NSMutableData()
    guard
        let destination = CGImageDestinationCreateWithData(
            mutableData,
            UTType.png.identifier as CFString,
            1,
            nil
        )
    else {
        throw FaviconError.cannotCreateImage
    }

    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else {
        throw FaviconError.cannotCreateImage
    }
    return mutableData as Data
}

func writePNG(_ image: CGImage, to url: URL) throws {
    do {
        try pngData(for: image).write(to: url, options: .atomic)
    } catch {
        throw FaviconError.cannotWrite(url.path)
    }
}

func writeICO(frames: [(size: Int, data: Data)], to url: URL) throws {
    var output = Data()
    output.appendLittleEndian(UInt16(0))
    output.appendLittleEndian(UInt16(1))
    output.appendLittleEndian(UInt16(frames.count))

    var dataOffset = 6 + (16 * frames.count)
    for frame in frames {
        output.append(UInt8(frame.size == 256 ? 0 : frame.size))
        output.append(UInt8(frame.size == 256 ? 0 : frame.size))
        output.append(UInt8(0))
        output.append(UInt8(0))
        output.appendLittleEndian(UInt16(1))
        output.appendLittleEndian(UInt16(32))
        output.appendLittleEndian(UInt32(frame.data.count))
        output.appendLittleEndian(UInt32(dataOffset))
        dataOffset += frame.data.count
    }

    for frame in frames {
        output.append(frame.data)
    }

    do {
        try output.write(to: url, options: .atomic)
    } catch {
        throw FaviconError.cannotWrite(url.path)
    }
}

func pixelBytes(for image: CGImage) throws -> [UInt8] {
    let width = image.width
    let height = image.height
    let context = try makeRGBAContext(width: width, height: height)
    drawTopLeft(
        context: context,
        image: image,
        rect: CGRect(x: 0, y: 0, width: width, height: height),
        canvasHeight: height,
        interpolation: .none
    )

    guard let data = context.data else {
        throw FaviconError.cannotCreateImage
    }
    let count = width * height * 4
    let pointer = data.bindMemory(to: UInt8.self, capacity: count)
    return Array(UnsafeBufferPointer(start: pointer, count: count))
}

func pixelStats(for image: CGImage) throws -> PixelStats {
    let width = image.width
    let height = image.height
    let pixels = try pixelBytes(for: image)
    let alphaAt: (Int, Int) -> UInt8 = { x, y in
        pixels[((y * width + x) * 4) + 3]
    }
    let cornerAlphas = [
        alphaAt(0, 0),
        alphaAt(width - 1, 0),
        alphaAt(0, height - 1),
        alphaAt(width - 1, height - 1),
    ]

    var maxOuterBandAlpha: UInt8 = 0
    var outerBandVisiblePixels = 0
    var transparentPixels = 0
    var visiblePixels = 0
    var nearWhiteSilhouetteEdgePixels = 0

    for y in 0..<height {
        for x in 0..<width {
            let offset = (y * width + x) * 4
            let alpha = pixels[offset + 3]
            let isOuterBand = x < 2 || y < 2 || x >= width - 2 || y >= height - 2

            if isOuterBand {
                maxOuterBandAlpha = max(maxOuterBandAlpha, alpha)
                if alpha > 0 {
                    outerBandVisiblePixels += 1
                }
            }

            if alpha == 0 {
                transparentPixels += 1
                continue
            }
            visiblePixels += 1

            var touchesTransparency = false
            for neighborY in max(0, y - 1)...min(height - 1, y + 1) {
                for neighborX in max(0, x - 1)...min(width - 1, x + 1) {
                    if alphaAt(neighborX, neighborY) == 0 {
                        touchesTransparency = true
                    }
                }
            }

            if touchesTransparency {
                let unpremultiply: (UInt8) -> Int = { value in
                    min(255, Int((Double(value) * 255.0 / Double(alpha)).rounded()))
                }
                let red = unpremultiply(pixels[offset])
                let green = unpremultiply(pixels[offset + 1])
                let blue = unpremultiply(pixels[offset + 2])
                let colorRange = max(red, green, blue) - min(red, green, blue)
                if red >= 240 && green >= 240 && blue >= 240 && colorRange <= 14 {
                    nearWhiteSilhouetteEdgePixels += 1
                }
            }
        }
    }

    return PixelStats(
        width: width,
        height: height,
        cornerAlphas: cornerAlphas,
        maxOuterBandAlpha: maxOuterBandAlpha,
        outerBandVisiblePixels: outerBandVisiblePixels,
        transparentPixels: transparentPixels,
        visiblePixels: visiblePixels,
        nearWhiteSilhouetteEdgePixels: nearWhiteSilhouetteEdgePixels
    )
}

func printStats(prefix: String, stats: PixelStats) {
    print(
        "\(prefix): " +
        "\(stats.width)x\(stats.height), " +
        "corners=\(stats.cornerAlphas), " +
        "outer2MaxAlpha=\(stats.maxOuterBandAlpha), " +
        "outer2Visible=\(stats.outerBandVisiblePixels), " +
        "transparent=\(stats.transparentPixels), " +
        "visible=\(stats.visiblePixels), " +
        "nearWhiteEdge=\(stats.nearWhiteSilhouetteEdgePixels)"
    )
}

func inspectExisting(_ label: String, url: URL) {
    guard fileManager.fileExists(atPath: url.path) else {
        print("BEFORE \(label): missing")
        return
    }

    let count = imageCount(url)
    if count == 0 {
        print("BEFORE \(label): unreadable")
        return
    }

    for index in 0..<count {
        do {
            let image = try loadImage(url, index: index)
            let stats = try pixelStats(for: image)
            printStats(prefix: "BEFORE \(label)[\(index)]", stats: stats)
        } catch {
            print("BEFORE \(label)[\(index)]: \(error)")
        }
    }
}

func verify(_ label: String, image: CGImage) throws {
    let stats = try pixelStats(for: image)
    printStats(prefix: "AFTER \(label)", stats: stats)

    if stats.cornerAlphas.contains(where: { $0 != 0 }) {
        throw FaviconError.verificationFailed("\(label) has a non-transparent corner")
    }
    if stats.maxOuterBandAlpha != 0 || stats.outerBandVisiblePixels != 0 {
        throw FaviconError.verificationFailed("\(label) has visible pixels in the outer 2px")
    }
    if stats.nearWhiteSilhouetteEdgePixels != 0 {
        throw FaviconError.verificationFailed(
            "\(label) has \(stats.nearWhiteSilhouetteEdgePixels) near-white edge pixels"
        )
    }
}

func renderPreview(
    icon: CGImage,
    size: Int,
    backgroundName: String,
    red: CGFloat,
    green: CGFloat,
    blue: CGFloat
) throws -> CGImage {
    let previewSize = 256
    let context = try makeRGBAContext(width: previewSize, height: previewSize)
    context.setFillColor(red: red, green: green, blue: blue, alpha: 1)
    context.fill(CGRect(x: 0, y: 0, width: previewSize, height: previewSize))
    drawTopLeft(
        context: context,
        image: icon,
        rect: CGRect(x: 0, y: 0, width: previewSize, height: previewSize),
        canvasHeight: previewSize,
        interpolation: .none
    )

    guard let preview = context.makeImage() else {
        throw FaviconError.cannotCreateImage
    }
    let outputURL = previewDirectory.appendingPathComponent(
        "toto-favicon-\(size)-\(backgroundName).png"
    )
    try writePNG(preview, to: outputURL)
    return preview
}

func renderContactSheet(previews: [CGImage]) throws {
    let cellSize = 256
    let columns = 3
    let rows = 2
    let context = try makeRGBAContext(
        width: columns * cellSize,
        height: rows * cellSize
    )

    for (index, preview) in previews.enumerated() {
        let column = index % columns
        let row = index / columns
        drawTopLeft(
            context: context,
            image: preview,
            rect: CGRect(
                x: column * cellSize,
                y: row * cellSize,
                width: cellSize,
                height: cellSize
            ),
            canvasHeight: rows * cellSize,
            interpolation: .none
        )
    }

    guard let sheet = context.makeImage() else {
        throw FaviconError.cannotCreateImage
    }
    try writePNG(
        sheet,
        to: previewDirectory.appendingPathComponent("toto-favicon-halo-check.png")
    )
}

do {
    inspectExisting("app/icon.png", url: iconURL)
    inspectExisting("app/apple-icon.png", url: appleIconURL)
    inspectExisting("app/favicon.ico", url: faviconURL)
    inspectExisting("public/favicon.ico", url: publicFaviconURL)

    let source = try loadImage(sourceURL)
    let transparentIcon = try makeTransparentIcon(from: source)
    let appleIcon = try resizePremultiplied(transparentIcon, size: 180)
    let frameImages = try frameSizes.map { size in
        (
            size: size,
            image: try resizePremultiplied(
                transparentIcon,
                size: size,
                transparentInset: 2
            )
        )
    }

    try writePNG(transparentIcon, to: iconURL)
    try writePNG(appleIcon, to: appleIconURL)
    let icoFrames = try frameImages.map { frame in
        (size: frame.size, data: try pngData(for: frame.image))
    }
    try writeICO(frames: icoFrames, to: faviconURL)

    try verify("app/icon.png", image: transparentIcon)
    try verify("app/apple-icon.png", image: appleIcon)
    for frame in frameImages {
        try verify("app/favicon.ico[\(frame.size)]", image: frame.image)
    }

    var previews: [CGImage] = []
    for frame in frameImages {
        previews.append(
            try renderPreview(
                icon: frame.image,
                size: frame.size,
                backgroundName: "black",
                red: 0,
                green: 0,
                blue: 0
            )
        )
    }
    for frame in frameImages {
        previews.append(
            try renderPreview(
                icon: frame.image,
                size: frame.size,
                backgroundName: "gray",
                red: 0.38,
                green: 0.40,
                blue: 0.44
            )
        )
    }
    try renderContactSheet(previews: previews)

    print("Generated app/icon.png, app/apple-icon.png, and app/favicon.ico")
    print("Rendered black/gray halo previews in /private/tmp")
} catch {
    fputs("generate-favicon.swift: \(error)\n", stderr)
    exit(1)
}
