import Foundation
import SwiftUI

@MainActor
final class InviteStudioState: ObservableObject {
    @Published var intake = InviteIntake.demo
    @Published var promptText = ""
    @Published var selectedPromptStarter: String?
    @Published var selectedPromptStarterChip: String?
    @Published var image: UIImage?
    @Published var prompt = ""
    @Published var elapsedText = ""
    @Published var isGenerating = false
    @Published var errorMessage: String?
    @Published var errorLog: String?
    @Published var voiceMessage: String?
    @Published var isRecording = false
    @Published var selectedVibe = "Garden party"
    @Published var selectedEventType = "Birthday"

    let service: InviteGenerationService
    private var speech: SpeechTranscribing?
    private var recordingSessionID: UUID?
    private let speechFactory: @MainActor () -> SpeechTranscribing
    private let defaultPromptStarter = "Tell us who it is for, what you are celebrating, when and where, and the feeling you want"
    private let starterTextMap = [
        "Kid's birthday": "Lily is turning 5 on May 18th at our house - pastel unicorn theme, snacks at 2pm",
        "Baby shower": "Baby shower for Maya on June 8th at the garden room - soft green and cream, sweet but modern",
        "Milestone birthday": "Milestone birthday for my mom at the lake house - classic, warm, a little nostalgic",
        "Dinner party": "Dinner party next Saturday at 7pm - cozy, seasonal, handwritten menu feeling",
        "Bridal shower": "Bridal shower for Emma on Sunday afternoon - garden florals, crisp serif type, soft blush",
        "Housewarming": "Housewarming for Alex and Jordan next Friday - relaxed, warm, new-home feeling",
        "Graduation": "Graduation party for Noah on May 31st at 6pm - backyard dinner, school colors, polished and fun"
    ]

    var promptStarter: String {
        selectedPromptStarter ?? "Lily is turning 5 on May 18th at our house - pastel unicorn theme, snacks at 2pm"
    }

    var canGenerate: Bool {
        !promptText.trimmed.isEmpty && !isGenerating
    }

    init(
        service: InviteGenerationService = OpenAIInviteGenerationService(),
        speechFactory: @escaping @MainActor () -> SpeechTranscribing = { SpeechTranscriptionService() }
    ) {
        self.service = service
        self.speechFactory = speechFactory
    }

    func generate() async {
        let description = promptText.trimmed
        guard !description.isEmpty else {
            errorMessage = "Tell us about the event before sketching."
            errorLog = nil
            return
        }

        isGenerating = true
        errorMessage = nil
        errorLog = nil
        image = nil
        prompt = ""
        elapsedText = ""

        do {
            let result = try await service.generateInvite(prompt: description)
            image = result.image
            prompt = result.prompt
            elapsedText = result.elapsedText
        } catch {
            if let inviteError = error as? InviteGenerationError {
                errorMessage = inviteError.userMessage
                errorLog = inviteError.diagnostic
            } else {
                errorMessage = error.localizedDescription
                errorLog = "Cordial Invites generation error: \(error.localizedDescription)"
            }
        }

        isGenerating = false
    }

    func applyPromptStarter(_ value: String) {
        selectedPromptStarterChip = value
        selectedPromptStarter = starterText(for: value)
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

    func applyEventType(_ value: String) {
        selectedEventType = value
        if intake.event.trimmed.isEmpty || Brand.eventTypes.contains(where: { intake.event.localizedCaseInsensitiveContains($0) }) {
            intake.event = value == "Other" ? "" : "\(value.lowercased()) invitation"
        }
    }

    func applyVibe(_ value: String) {
        selectedVibe = value
        let normalized = value.lowercased()
        if intake.vibe.trimmed.isEmpty {
            intake.vibe = normalized
        } else if !intake.vibe.localizedCaseInsensitiveContains(normalized) {
            intake.vibe = "\(intake.vibe), \(normalized)"
        }
    }

    private func starterText(for value: String) -> String {
        starterTextMap[value] ?? defaultPromptStarter
    }
}

struct InviteGenerationResult {
    var image: UIImage
    var prompt: String
    var elapsedText: String
}
