import Foundation
import UIKit

@MainActor
protocol InviteGenerationService {
    func generateInvite(prompt: String) async throws -> InviteGenerationResult
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
            let decoded = try JSONDecoder().decode(GenerateResponse.self, from: data)
            guard let first = decoded.images.first else {
                throw InviteGenerationError.missingImage
            }
            guard let imageData = Data(base64Encoded: first.b64Json),
                  let uiImage = UIImage(data: imageData) else {
                throw InviteGenerationError.corruptImage
            }

            return (response: decoded, image: uiImage)
        }.value

        let seconds = Double(decoded.response.ms) / 1000
        return InviteGenerationResult(
            image: decoded.image,
            prompt: decoded.response.prompt,
            elapsedText: "\(seconds.formatted(.number.precision(.fractionLength(1))))s"
        )
    }
}
