import Foundation
import SwiftUI
import UIKit

enum CreateStep: String {
    case prompt
    case details
    case style
    case generating
    case result
    case packages
}

@MainActor
final class InviteStudioState: ObservableObject {
    @Published var promptText = ""
    @Published var selectedPromptStarterChip: String?
    @Published var details = EventDetails()
    @Published var outputFormat = OutputFormat.fiveBySeven
    @Published var selectedStyle = InviteStyle.elegant
    @Published var selectedPalette = "Blush, sage, cream"
    @Published var avoidNotes = ""
    @Published var inspirationImageNote = ""
    @Published var advancedStyleNotes = ""
    @Published var createStep: CreateStep = .prompt
    @Published var currentInvite: InviteDesign?
    @Published var selectedRevisionID: UUID?
    @Published var gallery: [InviteDesign] = []
    @Published var accountDefaults = AccountDefaults()
    @Published var voiceMessage: String?
    @Published var isRecording = false
    @Published var isGenerating = false
    @Published var generationProgress = ""
    @Published var errorMessage: String?
    @Published var errorLog: String?
    @Published var editInstruction = ""
    @Published var packageMessage: String?

    let service: InviteGenerationService
    private var speech: SpeechTranscribing?
    private var recordingSessionID: UUID?
    private let speechFactory: @MainActor () -> SpeechTranscribing
    private let store = InviteLocalStore()

    private let starterTextMap = [
        "5-year-old birthday": "Lily is turning 5 on May 18 at our house. Pastel unicorn theme, snacks at 2pm, RSVP to Maya.",
        "Baby shower": "Baby shower for Maya on June 8 at the garden room. Soft green and cream, sweet but modern.",
        "Wedding shower": "Wedding shower for Emma on Sunday afternoon at The Conservatory. Garden florals, crisp serif type, soft blush.",
        "Graduation": "Graduation party for Noah on May 31 at 6pm in the backyard. School colors, polished and fun.",
        "Backyard BBQ": "Backyard BBQ hosted by Jordan next Saturday at 4pm. Casual, smoky, red gingham, bring a side.",
        "Quinceañera": "Quinceañera for Sofia on August 12 at 5pm at Starlight Hall. Elegant, rose gold, formal dress.",
        "Business grand opening": "Business grand opening for Cordial Studio on June 20 at 10am downtown. Modern, polished, ribbon-cutting energy."
    ]

    var promptStarter: String {
        "Tell Cordial Invites who it is for, what you are celebrating, when and where, and the feeling you want"
    }

    var canExtractDetails: Bool {
        !promptText.trimmed.isEmpty && !isGenerating
    }

    var canGenerate: Bool {
        details.hasMinimumDetails && !isGenerating
    }

    var selectedImage: UIImage? {
        guard let imageData = selectedRevision?.imageData else {
            return nil
        }
        return UIImage(data: imageData)
    }

    var selectedRevision: InviteRevision? {
        if let selectedRevisionID,
           let match = currentInvite?.revisions.first(where: { $0.id == selectedRevisionID }) {
            return match
        }
        return currentInvite?.selectedRevision
    }

    var packages: [PurchasePlaceholder] {
        [
            PurchasePlaceholder(packageName: "Image Export", priceLabel: "$4.99 placeholder"),
            PurchasePlaceholder(packageName: "Hosted RSVP Invite", priceLabel: "$14.99 placeholder"),
            PurchasePlaceholder(packageName: "Premium Event Kit", priceLabel: "$24.99 placeholder")
        ]
    }

    init(
        service: InviteGenerationService = MockInviteGenerationService(),
        speechFactory: @escaping @MainActor () -> SpeechTranscribing = { SpeechTranscriptionService() }
    ) {
        self.service = service
        self.speechFactory = speechFactory
        loadPersistedState()
    }

    func applyPromptStarter(_ value: String) {
        selectedPromptStarterChip = value
        promptText = starterTextMap[value] ?? promptStarter
        errorMessage = nil
    }

    func extractDetails() {
        let prompt = promptText.trimmed
        guard !prompt.isEmpty else {
            errorMessage = "Tell Cordial Invites about the event first."
            errorLog = nil
            return
        }

        details = PromptDetailsExtractor.extract(from: prompt, defaults: accountDefaults)
        outputFormat = accountDefaults.defaultOutputFormat
        selectedStyle = accountDefaults.preferredStyle
        selectedPalette = accountDefaults.preferredColors
        createStep = .details
        errorMessage = nil
        packageMessage = nil
    }

    func continueToStyle() {
        if details.outputPreference.trimmed.isEmpty {
            details.outputPreference = outputFormat.rawValue
        }
        createStep = .style
    }

    func generate(revisionInstruction: String? = nil) async {
        guard canGenerate else {
            errorMessage = "Add at least an event title, type, or honoree before generating."
            errorLog = nil
            return
        }

        isGenerating = true
        createStep = .generating
        generationProgress = "Reading event details"
        errorMessage = nil
        errorLog = nil
        packageMessage = nil

        let revisionIndex = (currentInvite?.revisions.count ?? 0) + 1
        let request = InviteGenerationRequest(
            originalPrompt: promptText,
            details: details,
            outputFormat: outputFormat,
            style: selectedStyle,
            colorPalette: selectedPalette,
            advancedStyleNotes: advancedStyleNotes,
            avoidNotes: avoidNotes,
            inspirationImageNote: inspirationImageNote,
            revisionInstruction: revisionInstruction,
            revisionIndex: revisionIndex
        )

        do {
            for step in ["Building layout", "Rendering invite", "Checking text placement", "Preparing preview"] {
                try await Task.sleep(for: .milliseconds(110))
                generationProgress = step
            }

            let result = try await service.generateInvite(request: request)
            guard let imageData = result.image.pngData() else {
                throw InviteGenerationError.corruptImage
            }

            let revision = InviteRevision(
                instruction: revisionInstruction?.trimmed.isEmpty == false ? revisionInstruction!.trimmed : "Initial generation",
                imageData: imageData,
                prompt: result.prompt,
                metadata: "Format: \(outputFormat.rawValue) | Style: \(selectedStyle.rawValue) | Source: \(result.source.displayName) | Elapsed: \(result.elapsedText)"
            )

            if var invite = currentInvite {
                invite.updatedAt = Date()
                invite.details = details
                invite.outputFormat = outputFormat
                invite.style = selectedStyle
                invite.colorPalette = selectedPalette
                invite.advancedStyleNotes = advancedStyleNotes.trimmed.isEmpty ? nil : advancedStyleNotes
                invite.avoidNotes = avoidNotes
                invite.inspirationImageNote = inspirationImageNote
                invite.status = .preview
                invite.revisions.append(revision)
                invite.selectedRevisionID = revision.id
                currentInvite = invite
            } else {
                currentInvite = InviteDesign(
                    originalPrompt: promptText,
                    details: details,
                    outputFormat: outputFormat,
                    style: selectedStyle,
                    colorPalette: selectedPalette,
                    advancedStyleNotes: advancedStyleNotes.trimmed.isEmpty ? nil : advancedStyleNotes,
                    avoidNotes: avoidNotes,
                    inspirationImageNote: inspirationImageNote,
                    status: .preview,
                    revisions: [revision],
                    selectedRevisionID: revision.id
                )
            }

            selectedRevisionID = revision.id
            upsertCurrentInvite()
            createStep = .result
        } catch {
            if let inviteError = error as? InviteGenerationError {
                errorMessage = inviteError.userMessage
                errorLog = inviteError.diagnostic
            } else {
                errorMessage = error.localizedDescription
                errorLog = "Cordial Invites generation error: \(error.localizedDescription)"
            }
            createStep = .style
        }

        isGenerating = false
        generationProgress = ""
    }

    func applyQuickEdit(_ instruction: String) {
        editInstruction = instruction
    }

    func submitEdit() async {
        let instruction = editInstruction.trimmed
        guard !instruction.isEmpty else {
            errorMessage = "Describe the edit you want first."
            return
        }

        if instruction.localizedCaseInsensitiveContains("navy") {
            selectedPalette = "Navy, gold, ivory"
        }
        if instruction.localizedCaseInsensitiveContains("playful") {
            selectedStyle = .kidsCartoon
        }
        if instruction.localizedCaseInsensitiveContains("formal") || instruction.localizedCaseInsensitiveContains("elegant") {
            selectedStyle = .elegant
        }

        editInstruction = ""
        await generate(revisionInstruction: instruction)
    }

    func regenerate() async {
        await generate(revisionInstruction: "Try another layout while preserving the confirmed event details.")
    }

    func selectRevision(_ revision: InviteRevision) {
        selectedRevisionID = revision.id
        currentInvite?.selectedRevisionID = revision.id
        upsertCurrentInvite()
    }

    func saveDraft() {
        currentInvite?.status = .draft
        upsertCurrentInvite()
        packageMessage = "Draft saved to Gallery."
    }

    func useThisInvite() {
        currentInvite?.status = .preview
        upsertCurrentInvite()
        createStep = .packages
    }

    func choosePackage(_ package: PurchasePlaceholder) {
        packageMessage = "\(package.packageName) is a stub. Billing is intentionally not wired in this pass."
    }

    func openGalleryInvite(_ invite: InviteDesign) {
        currentInvite = invite
        details = invite.details
        outputFormat = invite.outputFormat
        selectedStyle = invite.style
        selectedPalette = invite.colorPalette
        advancedStyleNotes = invite.advancedStyleNotes ?? ""
        avoidNotes = invite.avoidNotes
        inspirationImageNote = invite.inspirationImageNote
        selectedRevisionID = invite.selectedRevisionID
        createStep = .result
    }

    func openLatestInviteForEvidence() {
        if let invite = gallery.first {
            openGalleryInvite(invite)
            return
        }

        promptText = "Quinceañera for Sofia on August 12 at 5pm at Starlight Hall. Elegant, rose gold, formal dress."
        details = EventDetails(
            eventType: "Quinceañera",
            eventTitle: "Sofia's Quinceañera",
            honoree: "Sofia",
            hostName: "The Rivera Family",
            date: "Aug 12",
            startTime: "5pm",
            venueName: "Starlight Hall",
            rsvpContact: "Maria",
            dressCode: "Formal dress",
            specialNotes: "Elegant, rose gold, formal dress.",
            outputPreference: OutputFormat.fiveBySeven.rawValue
        )
        outputFormat = .fiveBySeven
        selectedStyle = .elegant
        selectedPalette = "Blush, sage, cream"

        let revision = InviteRevision(
            instruction: "Evidence demo preview",
            imageData: makeEvidenceImage().pngData() ?? Data(),
            prompt: "Local evidence preview generated without backend credentials.",
            metadata: "Format: 5x7 invite | Style: Elegant | Elapsed: mock"
        )
        currentInvite = InviteDesign(
            originalPrompt: promptText,
            details: details,
            outputFormat: outputFormat,
            style: selectedStyle,
            colorPalette: selectedPalette,
            avoidNotes: "",
            inspirationImageNote: "",
            status: .preview,
            revisions: [revision],
            selectedRevisionID: revision.id
        )
        selectedRevisionID = revision.id
        createStep = .result
    }

    func updateAccountDefaults() {
        store.save(defaults: accountDefaults)
        packageMessage = "Defaults saved locally."
    }

    func showPrivacyPlaceholder() {
        packageMessage = "Privacy settings are a placeholder until hosted RSVP accounts are wired."
    }

    func showDeleteAccountPlaceholder() {
        packageMessage = "Delete account is a placeholder because sign-in is not wired yet."
    }

    func startNewInvite() {
        promptText = ""
        selectedPromptStarterChip = nil
        details = EventDetails()
        outputFormat = accountDefaults.defaultOutputFormat
        selectedStyle = accountDefaults.preferredStyle
        selectedPalette = accountDefaults.preferredColors
        avoidNotes = ""
        inspirationImageNote = ""
        advancedStyleNotes = ""
        currentInvite = nil
        selectedRevisionID = nil
        createStep = .prompt
        errorMessage = nil
        errorLog = nil
        packageMessage = nil
    }

    func toggleRecording() {
        if recordingSessionID != nil || isRecording {
            stopRecording()
            return
        }

        errorMessage = nil
        errorLog = nil
        voiceMessage = "Requesting voice access..."
        let existingText = promptText.trimmed
        let sessionID = UUID()
        recordingSessionID = sessionID
        isRecording = true

        Task {
            do {
                guard recordingSessionID == sessionID else { return }
                let speech = self.speechService()
                try await speech.start(
                    onTranscript: { [weak self] transcript in
                        guard let self else { return }
                        guard self.recordingSessionID == sessionID else { return }
                        if existingText.isEmpty {
                            self.promptText = transcript
                        } else {
                            self.promptText = "\(existingText) \(transcript)"
                        }
                    },
                    onFinished: { [weak self] in
                        guard let self else { return }
                        guard self.recordingSessionID == sessionID else { return }
                        self.stopRecording()
                    }
                )
                guard recordingSessionID == sessionID else {
                    speech.stop()
                    return
                }
                voiceMessage = "Listening..."
            } catch {
                isRecording = false
                if recordingSessionID == sessionID {
                    recordingSessionID = nil
                }
                voiceMessage = error.localizedDescription
                errorMessage = error.localizedDescription
            }
        }
    }

    private func stopRecording() {
        recordingSessionID = nil
        isRecording = false
        speech?.stop()
        voiceMessage = nil
    }

    private func speechService() -> SpeechTranscribing {
        if let speech {
            return speech
        }

        let speech = speechFactory()
        self.speech = speech
        return speech
    }

    private func loadPersistedState() {
        gallery = store.loadGallery()
        accountDefaults = store.loadDefaults()
        outputFormat = accountDefaults.defaultOutputFormat
        selectedStyle = accountDefaults.preferredStyle
        selectedPalette = accountDefaults.preferredColors
    }

    private func upsertCurrentInvite() {
        guard let currentInvite else { return }
        if let index = gallery.firstIndex(where: { $0.id == currentInvite.id }) {
            gallery[index] = currentInvite
        } else {
            gallery.insert(currentInvite, at: 0)
        }
        store.save(gallery: gallery)
    }

    private func makeEvidenceImage() -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 750, height: 1050))
        return renderer.image { context in
            UIColor(red: 1.00, green: 0.97, blue: 0.91, alpha: 1).setFill()
            context.fill(CGRect(x: 0, y: 0, width: 750, height: 1050))
            UIColor(red: 0.55, green: 0.27, blue: 0.20, alpha: 1).setStroke()
            context.cgContext.setLineWidth(6)
            context.cgContext.stroke(CGRect(x: 54, y: 54, width: 642, height: 942))

            let paragraph = NSMutableParagraphStyle()
            paragraph.alignment = .center
            paragraph.lineSpacing = 10
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont(descriptor: UIFontDescriptor.preferredFontDescriptor(withTextStyle: .largeTitle).withDesign(.serif) ?? .preferredFontDescriptor(withTextStyle: .largeTitle), size: 72),
                .foregroundColor: UIColor(red: 0.13, green: 0.10, blue: 0.07, alpha: 1),
                .paragraphStyle: paragraph
            ]
            NSAttributedString(string: "Sofia's\nQuinceañera", attributes: titleAttributes)
                .draw(with: CGRect(x: 90, y: 230, width: 570, height: 220), options: [.usesLineFragmentOrigin], context: nil)

            let bodyAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 36, weight: .regular),
                .foregroundColor: UIColor(red: 0.13, green: 0.10, blue: 0.07, alpha: 0.86),
                .paragraphStyle: paragraph
            ]
            NSAttributedString(string: "Aug 12 at 5pm\nStarlight Hall\nHosted by The Rivera Family\nRSVP Maria", attributes: bodyAttributes)
                .draw(with: CGRect(x: 90, y: 520, width: 570, height: 240), options: [.usesLineFragmentOrigin], context: nil)
        }
    }
}

private enum PromptDetailsExtractor {
    static func extract(from prompt: String, defaults: AccountDefaults) -> EventDetails {
        let lower = prompt.lowercased()
        var details = EventDetails()
        details.eventType = eventType(in: lower)
        details.honoree = honoree(in: prompt)
        details.hostName = host(in: prompt)
        details.date = date(in: prompt)
        details.startTime = time(in: prompt)
        details.venueName = venue(in: prompt)
        details.address = address(in: prompt)
        details.rsvpContact = rsvpContact(in: prompt).ifEmpty(defaults.defaultRSVPContact)
        details.rsvpDeadline = deadline(in: prompt)
        details.dressCode = dressCode(in: prompt)
        details.registryLink = link(in: prompt)
        details.plusOneRules = lower.contains("no plus") ? "No plus-ones" : ""
        details.maxGuests = maxGuests(in: lower)
        details.specialNotes = prompt
        details.outputPreference = defaults.defaultOutputFormat.rawValue
        details.rsvp.maxPartySize = details.maxGuests.ifEmpty("2")

        if details.eventType.isEmpty {
            details.eventType = "Celebration"
        }
        details.eventTitle = title(for: details)
        return details
    }

    private static func eventType(in lower: String) -> String {
        let matches: [(String, String)] = [
            ("quince", "Quinceañera"),
            ("grand opening", "Business grand opening"),
            ("baby shower", "Baby shower"),
            ("wedding shower", "Wedding shower"),
            ("bridal shower", "Wedding shower"),
            ("graduation", "Graduation"),
            ("birthday", "Birthday party"),
            ("bbq", "Backyard BBQ"),
            ("barbecue", "Backyard BBQ"),
            ("dinner", "Dinner party"),
            ("housewarming", "Housewarming")
        ]
        return matches.first { lower.contains($0.0) }?.1 ?? ""
    }

    private static func honoree(in prompt: String) -> String {
        let patterns = [
            #"for\s+([A-Z][A-Za-z'’-]+)"#,
            #"([A-Z][A-Za-z'’-]+)\s+is\s+turning"#,
            #"honoring\s+([A-Z][A-Za-z'’-]+)"#
        ]
        return firstRegexCapture(patterns, in: prompt)
    }

    private static func host(in prompt: String) -> String {
        firstRegexCapture([#"hosted by\s+([A-Z][A-Za-z'’\- ]+?)(?:\.|,| on | at |$)"#], in: prompt)
    }

    private static func date(in prompt: String) -> String {
        if let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.date.rawValue),
           let match = detector.matches(in: prompt, range: NSRange(prompt.startIndex..., in: prompt)).first,
           let date = match.date {
            return date.formatted(date: .abbreviated, time: .omitted)
        }
        return firstRegexCapture([#"\b(next\s+[A-Za-z]+)"#, #"\b([A-Z][a-z]+\s+\d{1,2})\b"#], in: prompt)
    }

    private static func time(in prompt: String) -> String {
        firstRegexCapture([#"\b(\d{1,2}(?::\d{2})?\s?(?:am|pm|AM|PM))\b"#], in: prompt)
    }

    private static func venue(in prompt: String) -> String {
        firstRegexCapture([#"\bat\s+([A-Z0-9][A-Za-z0-9'’&\- ]+?)(?:\.|,| on | at \d| - | RSVP|$)"#], in: prompt)
    }

    private static func address(in prompt: String) -> String {
        firstRegexCapture([#"(\d{2,5}\s+[A-Z][A-Za-z0-9 .'-]+)"#], in: prompt)
    }

    private static func rsvpContact(in prompt: String) -> String {
        firstRegexCapture([#"RSVP(?:\s+to)?\s+([^.,]+)"#], in: prompt)
    }

    private static func deadline(in prompt: String) -> String {
        firstRegexCapture([#"RSVP by\s+([^.,]+)"#], in: prompt)
    }

    private static func dressCode(in prompt: String) -> String {
        firstRegexCapture([#"(formal dress|casual|black tie|cocktail attire|western attire)"#], in: prompt)
    }

    private static func link(in prompt: String) -> String {
        firstRegexCapture([#"(https?://\S+)"#], in: prompt)
    }

    private static func maxGuests(in lower: String) -> String {
        firstRegexCapture([#"max(?:imum)?\s+(\d+)\s+guests"#, #"party size\s+(\d+)"#], in: lower)
    }

    private static func title(for details: EventDetails) -> String {
        if !details.honoree.trimmed.isEmpty {
            return "\(details.honoree.trimmed)'s \(details.eventType.trimmed)"
        }
        return details.eventType.trimmed.isEmpty ? "Cordial Invite" : details.eventType.trimmed
    }

    private static func firstRegexCapture(_ patterns: [String], in text: String) -> String {
        for pattern in patterns {
            guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else {
                continue
            }
            let range = NSRange(text.startIndex..., in: text)
            guard let match = regex.firstMatch(in: text, range: range),
                  match.numberOfRanges > 1,
                  let capture = Range(match.range(at: 1), in: text) else {
                continue
            }
            return String(text[capture]).trimmed
        }
        return ""
    }
}

private struct InviteLocalStore {
    private let galleryKey = "cordial.gallery.v1"
    private let defaultsKey = "cordial.accountDefaults.v1"
    private let userDefaults = UserDefaults.standard

    func loadGallery() -> [InviteDesign] {
        guard let data = userDefaults.data(forKey: galleryKey),
              let decoded = try? JSONDecoder().decode([InviteDesign].self, from: data) else {
            return []
        }
        return decoded
    }

    func save(gallery: [InviteDesign]) {
        guard let data = try? JSONEncoder().encode(gallery) else { return }
        userDefaults.set(data, forKey: galleryKey)
    }

    func loadDefaults() -> AccountDefaults {
        guard let data = userDefaults.data(forKey: defaultsKey),
              let decoded = try? JSONDecoder().decode(AccountDefaults.self, from: data) else {
            return AccountDefaults()
        }
        return decoded
    }

    func save(defaults: AccountDefaults) {
        guard let data = try? JSONEncoder().encode(defaults) else { return }
        userDefaults.set(data, forKey: defaultsKey)
    }
}

private extension String {
    func ifEmpty(_ fallback: String) -> String {
        trimmed.isEmpty ? fallback : self
    }
}

struct InviteGenerationResult {
    var image: UIImage
    var prompt: String
    var elapsedText: String
    var source = InviteGenerationSource.remote
}

enum InviteGenerationSource: Equatable {
    case remote
    case localMock
    case localFallback

    var displayName: String {
        switch self {
        case .remote:
            "Remote"
        case .localMock:
            "Local mock"
        case .localFallback:
            "Local fallback"
        }
    }
}
