import Foundation
import PDFKit
import AppKit

struct RenderTarget {
    let examId: String
    let variant: String
    let pdfPath: String
}

let baseOutput = "/Users/jacob/IN1010-web/public/assets/exams"

let targets: [RenderTarget] = [
    .init(examId: "v24-midtveis", variant: "prompt", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/midtveis-v24.pdf"),
    .init(examId: "v24-midtveis", variant: "solution", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/fasit-midtveis-v24.pdf"),
    .init(examId: "v24-konte", variant: "prompt", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/midtveis-v24-konte.pdf"),
    .init(examId: "v24-konte", variant: "solution", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/midtveis-v24-konte-fasit.pdf"),
    .init(examId: "v24-prove", variant: "prompt", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/midtveis-v24-prove.pdf"),
    .init(examId: "v24-prove", variant: "solution", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/midtveis-v24-prove-fasit.pdf"),
    .init(examId: "v25-midtveis", variant: "prompt", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/in1010-v25-midtveis.pdf"),
    .init(examId: "v25-midtveis", variant: "solution", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/in1010-v25-midtveis-fasit.pdf"),
    .init(examId: "v25-konte", variant: "prompt", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/in1010-v25-midt-konte-uten-svar.pdf"),
    .init(examId: "v25-konte", variant: "solution", pdfPath: "/Users/jacob/Downloads/IN1010-midtveis/in1010-v25-midt-konte-med-svar.pdf")
]

func makeDir(_ path: String) throws {
    try FileManager.default.createDirectory(atPath: path, withIntermediateDirectories: true)
}

func renderPage(_ page: PDFPage, scale: CGFloat = 2.0) -> Data? {
    let box = page.bounds(for: .mediaBox)
    let width = Int(box.width * scale)
    let height = Int(box.height * scale)

    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: width,
        pixelsHigh: height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        return nil
    }

    NSGraphicsContext.saveGraphicsState()
    guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        NSGraphicsContext.restoreGraphicsState()
        return nil
    }

    NSGraphicsContext.current = context
    context.cgContext.setFillColor(NSColor.white.cgColor)
    context.cgContext.fill(CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
    context.cgContext.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context.cgContext)
    NSGraphicsContext.restoreGraphicsState()

    return bitmap.representation(using: .png, properties: [:])
}

for target in targets {
    let outputDir = "\(baseOutput)/\(target.examId)/\(target.variant)"
    do {
        try makeDir(outputDir)
    } catch {
        fputs("Failed to create output dir: \(outputDir)\n", stderr)
        exit(1)
    }

    guard let doc = PDFDocument(url: URL(fileURLWithPath: target.pdfPath)) else {
        fputs("Failed to open PDF: \(target.pdfPath)\n", stderr)
        exit(1)
    }

    for pageIndex in 0..<doc.pageCount {
        guard let page = doc.page(at: pageIndex), let data = renderPage(page) else {
            fputs("Failed to render page \(pageIndex + 1) of \(target.pdfPath)\n", stderr)
            exit(1)
        }

        let fileName = String(format: "page-%02d.png", pageIndex + 1)
        let outURL = URL(fileURLWithPath: outputDir).appendingPathComponent(fileName)
        do {
            try data.write(to: outURL)
        } catch {
            fputs("Failed to write \(outURL.path)\n", stderr)
            exit(1)
        }
    }

    print("Rendered \(doc.pageCount) pages for \(target.examId)/\(target.variant)")
}

print("Finished rendering all PDF assets.")
