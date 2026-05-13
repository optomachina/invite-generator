import Foundation
import UIKit

@MainActor
protocol InviteGenerationService {
    func generateInvite(intake: InviteIntake) async throws -> InviteGenerationResult
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
    private let baseURL: URL

    init(session: URLSession = .shared) {
        self.session = session
        let configured = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String
        self.baseURL = URL(string: configured ?? "https://invite-generator.vercel.app")!
    }

    func generateInvite(intake: InviteIntake) async throws -> InviteGenerationResult {
        guard let url = URL(string: "/api/generate", relativeTo: baseURL) else {
            throw InviteGenerationError.invalidBaseURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 300
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONEncoder().encode(
            GenerateRequest(intake: intake, settings: GenerationSettings())
        )

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw InviteGenerationError.invalidResponse
        }

        guard (200..<300).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "No response body"
            throw InviteGenerationError.badStatus(http.statusCode, message)
        }

        let decoded = try JSONDecoder().decode(GenerateResponse.self, from: data)
        guard let first = decoded.images.first else {
            throw InviteGenerationError.missingImage
        }
        guard let imageData = Data(base64Encoded: first.b64Json),
              let uiImage = UIImage(data: imageData) else {
            throw InviteGenerationError.corruptImage
        }

        let seconds = Double(decoded.ms) / 1000
        return InviteGenerationResult(
            image: uiImage,
            prompt: decoded.prompt,
            elapsedText: "\(seconds.formatted(.number.precision(.fractionLength(1))))s"
        )
    }
}
