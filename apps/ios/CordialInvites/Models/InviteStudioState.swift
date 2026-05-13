import Foundation
import SwiftUI

@MainActor
final class InviteStudioState: ObservableObject {
    @Published var intake = InviteIntake.demo
    @Published var image: UIImage?
    @Published var prompt = ""
    @Published var elapsedText = ""
    @Published var isGenerating = false
    @Published var errorMessage: String?
    @Published var selectedVibe = "Garden party"
    @Published var selectedEventType = "Birthday"

    let service: InviteGenerationService

    init(service: InviteGenerationService = OpenAIInviteGenerationService()) {
        self.service = service
    }

    func generate() async {
        guard intake.isReady else {
            errorMessage = "Add the event details before sketching."
            return
        }

        isGenerating = true
        errorMessage = nil
        image = nil
        prompt = ""
        elapsedText = ""

        do {
            let result = try await service.generateInvite(intake: intake)
            image = result.image
            prompt = result.prompt
            elapsedText = result.elapsedText
        } catch {
            errorMessage = error.localizedDescription
        }

        isGenerating = false
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
}

struct InviteGenerationResult {
    var image: UIImage
    var prompt: String
    var elapsedText: String
}
