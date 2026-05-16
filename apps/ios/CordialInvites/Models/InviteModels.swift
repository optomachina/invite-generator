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

struct EventDetails: Codable, Equatable {
    var eventType = ""
    var eventTitle = ""
    var honoree = ""
    var hostName = ""
    var date = ""
    var startTime = ""
    var endTime = ""
    var venueName = ""
    var address = ""
    var rsvpContact = ""
    var rsvpDeadline = ""
    var dressCode = ""
    var registryLink = ""
    var specialNotes = ""
    var plusOneRules = ""
    var maxGuests = ""
    var outputPreference = OutputFormat.fiveBySeven.rawValue
    var rsvp = RSVPSettings()

    var hasMinimumDetails: Bool {
        !eventTitle.trimmed.isEmpty || !eventType.trimmed.isEmpty || !honoree.trimmed.isEmpty
    }

    var displayTitle: String {
        if !eventTitle.trimmed.isEmpty {
            return eventTitle.trimmed
        }
        if !honoree.trimmed.isEmpty, !eventType.trimmed.isEmpty {
            return "\(honoree.trimmed)'s \(eventType.trimmed)"
        }
        if !eventType.trimmed.isEmpty {
            return eventType.trimmed
        }
        return "Untitled Invite"
    }

    var dateLine: String {
        [date.trimmed, startTime.trimmed].filter { !$0.isEmpty }.joined(separator: " at ")
    }

    var locationLine: String {
        [venueName.trimmed, address.trimmed].filter { !$0.isEmpty }.joined(separator: ", ")
    }
}

struct RSVPSettings: Codable, Equatable {
    var isEnabled = true
    var allowMaybe = true
    var allowPlusOnes = true
    var maxPartySize = "2"
    var askForGuestNote = true
    var askForMealChoice = false
}

enum OutputFormat: String, CaseIterable, Codable, Identifiable {
    case squareSocial = "Square social image"
    case fiveBySeven = "5x7 invite"
    case story = "Story format"
    case printablePDF = "Printable PDF placeholder"

    var id: String { rawValue }
}

enum InviteStyle: String, CaseIterable, Codable, Identifiable {
    case elegant = "Elegant"
    case modernMinimal = "Modern minimal"
    case floral = "Floral"
    case western = "Western"
    case kidsCartoon = "Kids cartoon"
    case luxuryBlackGold = "Luxury black/gold"
    case boho = "Boho"
    case retro = "Retro"
    case religiousTraditional = "Religious/traditional"
    case photoBased = "Photo-based"

    var id: String { rawValue }

    var descriptor: String {
        switch self {
        case .elegant: "serif type, refined spacing"
        case .modernMinimal: "clean type, lots of negative space"
        case .floral: "botanical border, soft illustrated florals"
        case .western: "ranch textures, warm neutrals"
        case .kidsCartoon: "bright shapes, playful illustrated details"
        case .luxuryBlackGold: "black field, gold accents, formal type"
        case .boho: "earthy palette, organic pattern"
        case .retro: "bold type, nostalgic color blocking"
        case .religiousTraditional: "formal layout, reverent ornament"
        case .photoBased: "large photo area with editorial text"
        }
    }
}

enum InviteStatus: String, Codable {
    case draft = "Draft"
    case preview = "Preview"
    case hostedPublished = "Hosted RSVP live"
    case publishedPlaceholder = "Published placeholder"
    case exportedPlaceholder = "Exported placeholder"
}

struct InviteRevision: Codable, Identifiable, Equatable {
    var id = UUID()
    var createdAt = Date()
    var instruction: String
    var imageData: Data
    var prompt: String
    var metadata: String
}

struct InviteDesign: Codable, Identifiable, Equatable {
    var id = UUID()
    var createdAt = Date()
    var updatedAt = Date()
    var originalPrompt: String
    var details: EventDetails
    var outputFormat: OutputFormat
    var style: InviteStyle
    var colorPalette: String
    var advancedStyleNotes: String?
    var avoidNotes: String
    var inspirationImageNote: String
    var status: InviteStatus
    var revisions: [InviteRevision]
    var selectedRevisionID: UUID?
    var hostedInviteID: String? = nil
    var hostedHostToken: String? = nil
    var hostedRSVPURL: String? = nil

    var selectedRevision: InviteRevision? {
        if let selectedRevisionID,
           let match = revisions.first(where: { $0.id == selectedRevisionID }) {
            return match
        }
        return revisions.last
    }
}

struct UserProfile: Codable, Equatable {
    var id = UUID()
    var email = ""
    var displayName = ""
}

struct AccountDefaults: Codable, Equatable {
    var preferredStyle = InviteStyle.elegant
    var preferredColors = "Blush, sage, cream"
    var defaultRSVPContact = ""
    var defaultOutputFormat = OutputFormat.fiveBySeven
}

struct RSVPResponse: Codable, Identifiable, Equatable {
    var id = UUID()
    var guestName = ""
    var status = "Maybe"
    var guestCount = 1
    var note = ""
    var mealChoice = ""
    var respondedAt: Date?
}

struct PurchasePlaceholder: Codable, Identifiable, Equatable {
    var id = UUID()
    var packageName: String
    var priceLabel: String
    var isBillingWired = false
}

struct InviteGenerationRequest: Codable, Equatable {
    var originalPrompt: String
    var details: EventDetails
    var outputFormat: OutputFormat
    var style: InviteStyle
    var colorPalette: String
    var advancedStyleNotes: String
    var avoidNotes: String
    var inspirationImageNote: String
    var revisionInstruction: String?
    var revisionIndex: Int

    var promptForGenerator: String {
        var parts = [
            "Create a \(outputFormat.rawValue) invitation.",
            "Event: \(details.displayTitle).",
            details.dateLine.isEmpty ? "" : "Date/time: \(details.dateLine).",
            details.locationLine.isEmpty ? "" : "Location: \(details.locationLine).",
            "Style: \(style.rawValue), \(style.descriptor).",
            colorPalette.trimmed.isEmpty ? "" : "Palette: \(colorPalette.trimmed).",
            advancedStyleNotes.trimmed.isEmpty ? "" : "Advanced style notes: \(advancedStyleNotes.trimmed).",
            details.specialNotes.trimmed.isEmpty ? "" : "Notes: \(details.specialNotes.trimmed).",
            avoidNotes.trimmed.isEmpty ? "" : "Avoid: \(avoidNotes.trimmed)."
        ]
        if let revisionInstruction, !revisionInstruction.trimmed.isEmpty {
            parts.append("Revision request: \(revisionInstruction.trimmed).")
        }
        return parts.filter { !$0.trimmed.isEmpty }.joined(separator: " ")
    }
}

struct GenerationSettings: Codable, Equatable {
    var model = "gpt-image-2"
    var quality = "low"
    var size = "1024x1536"
    var n = 1
}

struct GenerateRequest: Codable {
    var prompt: String?
    var intake: InviteIntake?
    var settings: GenerationSettings

    var isValid: Bool {
        if let prompt, !prompt.trimmed.isEmpty {
            return true
        }
        return intake != nil
    }

    init(prompt: String? = nil, intake: InviteIntake? = nil, settings: GenerationSettings) {
        self.prompt = prompt
        self.intake = intake
        self.settings = settings
    }
}

struct GenerateResponse: Decodable {
    var images: [GeneratedImage]
    var prompt: String
    var ms: Int
    var costUsd: Double
    var settings: GenerationSettings
}

struct HostedInvitePublishRequest: Codable {
    var details: EventDetails
    var rsvpSettings: RSVPSettings
    var imageB64: String?
}

struct HostedInvitePublishResponse: Decodable, Equatable {
    var id: String
    var slug: String
    var hostToken: String
    var publicUrl: String
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
