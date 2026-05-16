import Testing
@testable import CordialInvites

struct CordialInvitesTests {
    @Test func intakeRequiresCoreEventDetails() {
        var intake = InviteIntake.demo
        #expect(intake.isReady)

        intake.location = " "
        #expect(!intake.isReady)
    }

    @Test func generationDefaultsUseSingleLowQualityImage2Request() throws {
        let settings = GenerationSettings()

        #expect(settings.model == "gpt-image-2")
        #expect(settings.quality == "low")
        #expect(settings.size == "1024x1536")
        #expect(settings.n == 1)
    }

    @MainActor
    @Test func promptExtractionCreatesEditableRSVPReadyDetails() {
        let state = InviteStudioState()
        state.promptText = "Quinceañera for Sofia on August 12 at 5pm at Starlight Hall. Elegant rose gold, formal dress, RSVP to Maria."

        state.extractDetails()

        #expect(state.createStep == .details)
        #expect(state.details.eventType == "Quinceañera")
        #expect(state.details.honoree == "Sofia")
        #expect(state.details.startTime == "5pm")
        #expect(state.details.rsvp.isEnabled)
        #expect(state.outputFormat == .fiveBySeven)
    }

    @MainActor
    @Test func mockGenerationPreservesRevisionHistory() async throws {
        let state = InviteStudioState()
        state.promptText = "Graduation party for Noah on May 31 at 6pm in the backyard."
        state.extractDetails()
        state.continueToStyle()

        await state.generate()
        #expect(state.currentInvite?.revisions.count == 1)
        #expect(state.createStep == .result)

        state.editInstruction = "Make it more formal and use navy and gold."
        await state.submitEdit()

        #expect(state.currentInvite?.revisions.count == 2)
        #expect(state.selectedPalette == "Navy, gold, ivory")
    }

    @MainActor
    @Test func advancedStyleNotesAreIncludedInGeneratedPrompt() async throws {
        let state = InviteStudioState()
        state.promptText = "Garden brunch for Priya on June 2 at 11am at the conservatory."
        state.extractDetails()
        state.continueToStyle()
        state.advancedStyleNotes = "Use hand-lettered typography and pressed-flower borders."

        await state.generate()

        #expect(state.currentInvite?.advancedStyleNotes == "Use hand-lettered typography and pressed-flower borders.")
        #expect(state.currentInvite?.selectedRevision?.prompt.contains("Advanced style notes: Use hand-lettered typography and pressed-flower borders.") == true)
    }

    @MainActor
    @Test func generationFallsBackToLocalRendererWhenRemoteFails() async throws {
        let service = RemoteThenFallbackInviteGenerationService(
            remote: FailingGenerationService(),
            fallback: MockInviteGenerationService()
        )
        let state = InviteStudioState(service: service)
        state.promptText = "Launch party for Cordial Studio on June 20 at 6pm downtown."
        state.extractDetails()
        state.continueToStyle()

        await state.generate()

        let revision = try #require(state.currentInvite?.selectedRevision)
        #expect(state.createStep == .result)
        #expect(revision.metadata.contains("Source: Local fallback"))
        #expect(revision.prompt.contains("Launch party"))
    }

    @MainActor
    @Test func voiceToggleOffClearsListeningIndicator() async throws {
        let transcriber = FakeSpeechTranscriber(transcript: "Backyard birthday brunch on Saturday at 10am")
        let state = InviteStudioState(speechFactory: { transcriber })

        state.toggleRecording()
        try await waitUntil {
            state.isRecording && state.voiceMessage == "Listening..."
        }

        state.toggleRecording()

        #expect(!state.isRecording)
        #expect(state.voiceMessage == nil)
        #expect(state.promptText == "Backyard birthday brunch on Saturday at 10am")
        #expect(transcriber.stopped)
    }

    @MainActor
    @Test func stoppedVoiceSessionIgnoresLateCallbacks() async throws {
        let transcriber = FakeSpeechTranscriber(transcript: "Backyard birthday brunch on Saturday at 10am")
        let state = InviteStudioState(speechFactory: { transcriber })

        state.toggleRecording()
        try await waitUntil {
            state.isRecording && state.voiceMessage == "Listening..."
        }

        state.toggleRecording()
        transcriber.emitTranscript("Late callback after stop")
        transcriber.finish()

        #expect(!state.isRecording)
        #expect(state.voiceMessage == nil)
        #expect(state.promptText == "Backyard birthday brunch on Saturday at 10am")
    }

    @MainActor
    private func waitUntil(
        timeout: Duration = .seconds(2),
        _ condition: @escaping @MainActor () -> Bool
    ) async throws {
        let deadline = ContinuousClock.now + timeout
        while !condition() {
            if ContinuousClock.now >= deadline {
                Issue.record("Timed out waiting for condition")
                return
            }
            try await Task.sleep(for: .milliseconds(20))
        }
    }
}

@MainActor
private final class FailingGenerationService: InviteGenerationService {
    func generateInvite(prompt _: String) async throws -> InviteGenerationResult {
        throw InviteGenerationError.invalidBaseURL
    }
}

@MainActor
private final class FakeSpeechTranscriber: SpeechTranscribing {
    private let transcript: String
    private(set) var stopped = false
    private var onTranscript: ((String) -> Void)?
    private var onFinished: (() -> Void)?

    init(transcript: String) {
        self.transcript = transcript
    }

    func start(
        onTranscript: @escaping (String) -> Void,
        onFinished: (() -> Void)?
    ) async throws {
        stopped = false
        self.onTranscript = onTranscript
        self.onFinished = onFinished
        onTranscript(transcript)
    }

    func stop() {
        stopped = true
    }

    func emitTranscript(_ value: String) {
        guard !stopped else { return }
        onTranscript?(value)
    }

    func finish() {
        guard !stopped else { return }
        onFinished?()
    }
}
