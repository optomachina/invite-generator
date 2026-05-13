import Foundation
import UIKit

@MainActor
protocol InviteGenerationService {
    func generateInvite(prompt: String) async throws -> InviteGenerationResult
}

enum InviteGenerationError: LocalizedError {
    case invalidBaseURL
    case invalidResponse
    case badStatus(Int, String)
    case missingImage
    case corruptImage

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            "The invite service URL is not configured."
        case .invalidResponse:
            "The invite service returned an unexpected response."
        case let .badStatus(code, message):
            "Generation failed (\(code)): \(message)"
        case .missingImage:
            "The invite service did not return an image."
        case .corruptImage:
            "The generated image could not be decoded."
        }
    }
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
        request.httpBody = try JSONEncoder().encode(
            GenerateRequest(prompt: prompt, settings: GenerationSettings())
        )

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw InviteGenerationError.invalidResponse
        }

        guard (200..<300).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "No response body"
            throw InviteGenerationError.badStatus(http.statusCode, message)
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
