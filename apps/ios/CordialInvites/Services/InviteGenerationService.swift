import Foundation
import ImageIO
import UIKit

@MainActor
protocol InviteGenerationService {
    func generateInvite(prompt: String) async throws -> InviteGenerationResult
    func generateInvite(request: InviteGenerationRequest) async throws -> InviteGenerationResult
}

extension InviteGenerationService {
    func generateInvite(request: InviteGenerationRequest) async throws -> InviteGenerationResult {
        try await generateInvite(prompt: request.promptForGenerator)
    }
}

enum InviteGenerationError: LocalizedError {
    case invalidBaseURL
    case invalidRequest
    case invalidResponse
    case badStatus(Int, String, String)
    case missingImage
    case corruptImage

    var errorDescription: String? {
        userMessage
    }

    var userMessage: String {
        switch self {
        case .invalidBaseURL:
            "The invite service URL is not configured."
        case .invalidRequest:
            "Tell us about the event before sketching."
        case .invalidResponse:
            "The invite service returned an unexpected response."
        case let .badStatus(code, message, _):
            "Generation failed (\(code)): \(message)"
        case .missingImage:
            "The invite service did not return an image."
        case .corruptImage:
            "The generated image could not be decoded."
        }
    }

    var diagnostic: String {
        if case let .badStatus(code, message, body) = self {
            #if DEBUG
            let responseSummary = String(body.prefix(1500))
            #else
            let responseSummary = Self.releaseResponseSummary(from: body)
            #endif
            return """
            Cordial Invites generation error
            Status: \(code)
            Message: \(message)
            Response: \(responseSummary)
            """
        }

        return "Cordial Invites generation error: \(userMessage)"
    }

    private static func releaseResponseSummary(from body: String) -> String {
        guard
            let data = body.data(using: .utf8),
            let error = try? JSONDecoder().decode(ErrorResponse.self, from: data),
            let requestId = error.requestId
        else {
            return "Redacted in release builds."
        }

        return "Redacted in release builds. Request ID: \(requestId)"
    }
}

@MainActor
protocol HostedRSVPPublishing {
    func publishInvite(details: EventDetails, rsvpSettings: RSVPSettings, imageData: Data?) async throws -> HostedInvitePublishResponse
}

private struct ErrorResponse: Decodable {
    var error: String?
    var detail: String?
    var requestId: String?
}

@MainActor
final class OpenAIInviteGenerationService: InviteGenerationService {
    private let session: URLSession
    private let baseURL: URL?
    private let generatePath: String

    init(session: URLSession = .shared) {
        self.session = session
        let configuredBaseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
        let configuredGeneratePath = Bundle.main.object(forInfoDictionaryKey: "API_GENERATE_PATH") as? String
        self.baseURL = configuredBaseURL.flatMap(URL.init(string:))
        self.generatePath = configuredGeneratePath ?? ""
    }

    func generateInvite(prompt: String) async throws -> InviteGenerationResult {
        guard let baseURL, !generatePath.trimmed.isEmpty else {
            throw InviteGenerationError.invalidBaseURL
        }

        let url = generatePath
            .split(separator: "/")
            .reduce(baseURL) { partialURL, component in
                partialURL.appending(path: String(component))
            }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 300
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        let body = GenerateRequest(prompt: prompt, settings: GenerationSettings())
        guard body.isValid else {
            throw InviteGenerationError.invalidRequest
        }
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw InviteGenerationError.invalidResponse
        }

        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "No response body"
            if let error = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                let message = [error.error, error.detail].compactMap { $0 }.joined(separator: " ")
                let request = error.requestId.map { " Request ID: \($0)" } ?? ""
                throw InviteGenerationError.badStatus(
                    http.statusCode,
                    message.isEmpty ? "The invite service failed.\(request)" : "\(message)\(request)",
                    body
                )
            }
            throw InviteGenerationError.badStatus(
                http.statusCode,
                "The invite service returned an internal error.",
                body
            )
        }

        let decoded = try await Task.detached(priority: .userInitiated) {
            try autoreleasepool {
                let response = try JSONDecoder().decode(GenerateResponse.self, from: data)
                guard let first = response.images.first else {
                    throw InviteGenerationError.missingImage
                }
                guard let imageData = Data(base64Encoded: first.b64Json),
                      let uiImage = DownsampledImageDecoder.decode(imageData) else {
                    throw InviteGenerationError.corruptImage
                }

                return DecodedInvite(
                    image: uiImage,
                    prompt: response.prompt,
                    milliseconds: response.ms
                )
            }
        }.value

        let seconds = Double(decoded.milliseconds) / 1000
        return InviteGenerationResult(
            image: decoded.image,
            prompt: decoded.prompt,
            elapsedText: "\(seconds.formatted(.number.precision(.fractionLength(1))))s",
            source: .remote
        )
    }
}

@MainActor
final class HostedRSVPService: HostedRSVPPublishing {
    private let session: URLSession
    private let baseURL: URL?
    private let publishPath: String

    init(session: URLSession = .shared) {
        self.session = session
        let configuredBaseURL = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
        let configuredPath = Bundle.main.object(forInfoDictionaryKey: "API_HOSTED_INVITES_PATH") as? String
        self.baseURL = configuredBaseURL.flatMap(URL.init(string:))
        self.publishPath = configuredPath ?? ""
    }

    func publishInvite(details: EventDetails, rsvpSettings: RSVPSettings, imageData: Data?) async throws -> HostedInvitePublishResponse {
        guard let baseURL, !publishPath.trimmed.isEmpty else {
            throw InviteGenerationError.invalidBaseURL
        }

        let url = publishPath
            .split(separator: "/")
            .reduce(baseURL) { partialURL, component in
                partialURL.appending(path: String(component))
            }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 60
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONEncoder().encode(
            HostedInvitePublishRequest(
                details: details,
                rsvpSettings: rsvpSettings,
                imageB64: imageData?.base64EncodedString()
            )
        )

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw InviteGenerationError.invalidResponse
        }

        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? "No response body"
            if let error = try? JSONDecoder().decode(ErrorResponse.self, from: data) {
                let message = [error.error, error.detail].compactMap { $0 }.joined(separator: " ")
                throw InviteGenerationError.badStatus(
                    http.statusCode,
                    message.isEmpty ? "The hosted RSVP service failed." : message,
                    body
                )
            }
            throw InviteGenerationError.badStatus(
                http.statusCode,
                "The hosted RSVP service returned an internal error.",
                body
            )
        }

        do {
            return try JSONDecoder().decode(HostedInvitePublishResponse.self, from: data)
        } catch {
            throw InviteGenerationError.invalidResponse
        }
    }
}

@MainActor
final class RemoteThenFallbackInviteGenerationService: InviteGenerationService {
    private let remote: InviteGenerationService
    private let fallback: InviteGenerationService

    init(
        remote: InviteGenerationService = OpenAIInviteGenerationService(),
        fallback: InviteGenerationService = MockInviteGenerationService()
    ) {
        self.remote = remote
        self.fallback = fallback
    }

    func generateInvite(prompt: String) async throws -> InviteGenerationResult {
        do {
            return try await remote.generateInvite(prompt: prompt)
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            var result = try await fallback.generateInvite(prompt: prompt)
            result.source = .localFallback
            return result
        }
    }

    func generateInvite(request: InviteGenerationRequest) async throws -> InviteGenerationResult {
        do {
            return try await remote.generateInvite(request: request)
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            var result = try await fallback.generateInvite(request: request)
            result.source = .localFallback
            return result
        }
    }
}

@MainActor
final class MockInviteGenerationService: InviteGenerationService {
    func generateInvite(prompt: String) async throws -> InviteGenerationResult {
        let details = EventDetails(eventType: "Celebration", eventTitle: "Cordial Invite", specialNotes: prompt)
        let request = InviteGenerationRequest(
            originalPrompt: prompt,
            details: details,
            outputFormat: .fiveBySeven,
            style: .elegant,
            colorPalette: "Blush, sage, cream",
            advancedStyleNotes: "",
            avoidNotes: "",
            inspirationImageNote: "",
            revisionInstruction: nil,
            revisionIndex: 1
        )
        return try await generateInvite(request: request)
    }

    func generateInvite(request: InviteGenerationRequest) async throws -> InviteGenerationResult {
        try await Task.sleep(for: .milliseconds(120))
        let renderer = PlaceholderInviteRenderer(request: request)
        let image = renderer.render()
        return InviteGenerationResult(
            image: image,
            prompt: request.promptForGenerator,
            elapsedText: "mock",
            source: .localMock
        )
    }
}

private struct PlaceholderInviteRenderer {
    let request: InviteGenerationRequest

    func render() -> UIImage {
        let size = canvasSize(for: request.outputFormat)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 2
        let renderer = UIGraphicsImageRenderer(size: size, format: format)

        return renderer.image { context in
            let rect = CGRect(origin: .zero, size: size)
            let colors = palette(for: request.style, colorText: request.colorPalette)
            colors.background.setFill()
            context.fill(rect)

            drawBorder(in: rect, context: context.cgContext, colors: colors)
            drawOrnaments(in: rect, context: context.cgContext, colors: colors)

            let inset = size.width * 0.1
            let textRect = rect.insetBy(dx: inset, dy: size.height * 0.12)
            drawEyebrow("CORDIAL INVITES", in: textRect, color: colors.accent)
            drawTitle(request.details.displayTitle, in: textRect.offsetBy(dx: 0, dy: size.height * 0.12), color: colors.ink)
            drawBodyLines(in: textRect.offsetBy(dx: 0, dy: size.height * 0.46), colors: colors)
            drawFooter(in: textRect.offsetBy(dx: 0, dy: size.height * 0.72), colors: colors)
        }
    }

    private func canvasSize(for format: OutputFormat) -> CGSize {
        switch format {
        case .squareSocial:
            CGSize(width: 900, height: 900)
        case .fiveBySeven, .printablePDF:
            CGSize(width: 750, height: 1050)
        case .story:
            CGSize(width: 720, height: 1280)
        }
    }

    private func palette(for style: InviteStyle, colorText: String) -> RenderPalette {
        let lower = colorText.lowercased()
        if lower.contains("navy") || lower.contains("blue") {
            return RenderPalette(
                background: UIColor(red: 0.93, green: 0.95, blue: 0.97, alpha: 1),
                paper: UIColor(red: 0.98, green: 0.97, blue: 0.93, alpha: 1),
                ink: UIColor(red: 0.06, green: 0.11, blue: 0.20, alpha: 1),
                accent: UIColor(red: 0.73, green: 0.54, blue: 0.23, alpha: 1)
            )
        }

        switch style {
        case .luxuryBlackGold:
            return RenderPalette(
                background: UIColor(red: 0.04, green: 0.04, blue: 0.04, alpha: 1),
                paper: UIColor(red: 0.10, green: 0.09, blue: 0.08, alpha: 1),
                ink: UIColor(red: 0.96, green: 0.88, blue: 0.67, alpha: 1),
                accent: UIColor(red: 0.78, green: 0.59, blue: 0.25, alpha: 1)
            )
        case .kidsCartoon:
            return RenderPalette(
                background: UIColor(red: 1.00, green: 0.93, blue: 0.72, alpha: 1),
                paper: UIColor(red: 1.00, green: 0.98, blue: 0.92, alpha: 1),
                ink: UIColor(red: 0.15, green: 0.10, blue: 0.27, alpha: 1),
                accent: UIColor(red: 0.89, green: 0.30, blue: 0.38, alpha: 1)
            )
        case .modernMinimal:
            return RenderPalette(
                background: UIColor(red: 0.96, green: 0.96, blue: 0.94, alpha: 1),
                paper: UIColor.white,
                ink: UIColor(red: 0.08, green: 0.08, blue: 0.07, alpha: 1),
                accent: UIColor(red: 0.20, green: 0.35, blue: 0.35, alpha: 1)
            )
        case .western, .boho, .retro:
            return RenderPalette(
                background: UIColor(red: 0.93, green: 0.84, blue: 0.70, alpha: 1),
                paper: UIColor(red: 0.98, green: 0.93, blue: 0.82, alpha: 1),
                ink: UIColor(red: 0.18, green: 0.10, blue: 0.06, alpha: 1),
                accent: UIColor(red: 0.63, green: 0.25, blue: 0.15, alpha: 1)
            )
        default:
            return RenderPalette(
                background: UIColor(red: 0.96, green: 0.91, blue: 0.84, alpha: 1),
                paper: UIColor(red: 1.00, green: 0.98, blue: 0.93, alpha: 1),
                ink: UIColor(red: 0.13, green: 0.10, blue: 0.07, alpha: 1),
                accent: UIColor(red: 0.55, green: 0.27, blue: 0.20, alpha: 1)
            )
        }
    }

    private func drawBorder(in rect: CGRect, context: CGContext, colors: RenderPalette) {
        let border = rect.insetBy(dx: rect.width * 0.055, dy: rect.width * 0.055)
        context.setStrokeColor(colors.accent.withAlphaComponent(0.75).cgColor)
        context.setLineWidth(6)
        context.stroke(border)

        let inner = border.insetBy(dx: 18, dy: 18)
        context.setStrokeColor(colors.accent.withAlphaComponent(0.25).cgColor)
        context.setLineWidth(2)
        context.stroke(inner)
    }

    private func drawOrnaments(in rect: CGRect, context: CGContext, colors: RenderPalette) {
        context.setFillColor(colors.accent.withAlphaComponent(0.16).cgColor)
        for index in 0..<7 {
            let diameter = rect.width * CGFloat(0.08 + Double(index % 3) * 0.018)
            let x = rect.width * CGFloat(0.12 + Double(index) * 0.12)
            let y = rect.height * (index.isMultiple(of: 2) ? 0.08 : 0.88)
            context.fillEllipse(in: CGRect(x: x, y: y, width: diameter, height: diameter))
        }
    }

    private func drawEyebrow(_ text: String, in rect: CGRect, color: UIColor) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: rect.width * 0.035, weight: .semibold),
            .foregroundColor: color,
            .kern: 5
        ]
        drawCentered(text.uppercased(), in: CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: 48), attributes: attributes)
    }

    private func drawTitle(_ text: String, in rect: CGRect, color: UIColor) {
        let fontSize = max(42, min(82, 520 / CGFloat(max(text.count, 8)) * 2.2))
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineSpacing = 4
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont(descriptor: UIFontDescriptor.preferredFontDescriptor(withTextStyle: .largeTitle).withDesign(.serif) ?? .preferredFontDescriptor(withTextStyle: .largeTitle), size: fontSize),
            .foregroundColor: color,
            .paragraphStyle: paragraph
        ]
        drawCentered(text, in: CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: rect.height * 0.26), attributes: attributes)
    }

    private func drawBodyLines(in rect: CGRect, colors: RenderPalette) {
        let lines = [
            request.details.dateLine,
            request.details.locationLine,
            request.details.hostName.trimmed.isEmpty ? "" : "Hosted by \(request.details.hostName.trimmed)",
            request.details.dressCode.trimmed.isEmpty ? "" : request.details.dressCode.trimmed
        ].filter { !$0.trimmed.isEmpty }

        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineSpacing = 12
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: rect.width * 0.055, weight: .regular),
            .foregroundColor: colors.ink.withAlphaComponent(0.86),
            .paragraphStyle: paragraph
        ]
        drawCentered(lines.joined(separator: "\n"), in: CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: rect.height * 0.22), attributes: attributes)
    }

    private func drawFooter(in rect: CGRect, colors: RenderPalette) {
        let footer = request.details.rsvpContact.trimmed.isEmpty
            ? request.style.rawValue
            : "RSVP \(request.details.rsvpContact.trimmed)"
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: rect.width * 0.038, weight: .semibold),
            .foregroundColor: colors.accent
        ]
        drawCentered(footer, in: CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: 54), attributes: attributes)
    }

    private func drawCentered(_ text: String, in rect: CGRect, attributes: [NSAttributedString.Key: Any]) {
        let attributed = NSAttributedString(string: text, attributes: attributes)
        attributed.draw(with: rect, options: [.usesLineFragmentOrigin, .usesFontLeading], context: nil)
    }
}

private struct RenderPalette {
    var background: UIColor
    var paper: UIColor
    var ink: UIColor
    var accent: UIColor
}

private struct DecodedInvite {
    var image: UIImage
    var prompt: String
    var milliseconds: Int
}

private enum DownsampledImageDecoder {
    private static let maxPixelSize = 1536

    static func decode(_ data: Data) -> UIImage? {
        let sourceOptions = [
            kCGImageSourceShouldCache: false
        ] as CFDictionary
        guard let source = CGImageSourceCreateWithData(data as CFData, sourceOptions) else {
            return nil
        }

        let thumbnailOptions = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixelSize
        ] as CFDictionary
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, thumbnailOptions) else {
            return nil
        }

        return UIImage(cgImage: image)
    }
}
