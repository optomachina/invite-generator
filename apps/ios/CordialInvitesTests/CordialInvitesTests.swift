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
        onTranscript?(value)
    }

    func finish() {
        onFinished?()
    }
}
