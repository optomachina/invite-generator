import Foundation

struct InviteIntake: Codable, Equatable {
    var honoree: String = ""
    var age: Int?
    var event: String = ""
    var date: String = ""
    var time: String = ""
    var location: String = ""
    var vibe: String = ""

    var isReady: Bool {
        !honoree.trimmed.isEmpty &&
        !event.trimmed.isEmpty &&
        !date.trimmed.isEmpty &&
        !time.trimmed.isEmpty &&
        !location.trimmed.isEmpty &&
        !vibe.trimmed.isEmpty
    }

    static let demo = InviteIntake(
        honoree: "Lily",
        age: 5,
        event: "birthday party",
        date: "Saturday, June 13",
        time: "2:00 PM",
        location: "Magnolia Park, Pavilion 3",
        vibe: "garden tea-party, soft pastels, illustrated florals, hand-drawn feel"
    )
}

struct GenerationSettings: Codable, Equatable {
    var model = "gpt-image-2"
    var quality = "low"
    var size = "1024x1536"
    var n = 1
}

struct GenerateRequest: Codable {
    var intake: InviteIntake
    var settings: GenerationSettings
}

struct GenerateResponse: Decodable {
    var images: [GeneratedImage]
    var prompt: String
    var ms: Int
    var costUsd: Double
    var settings: GenerationSettings
}

struct GeneratedImage: Decodable {
    var b64Json: String

    enum CodingKeys: String, CodingKey {
        case b64Json = "b64_json"
    }
}

extension String {
    var trimmed: String {
        trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
