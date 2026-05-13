import AVFoundation
import Foundation
import Speech

enum SpeechTranscriptionError: LocalizedError {
    case unavailable
    case notAuthorized

    var errorDescription: String? {
        switch self {
        case .unavailable:
            "Voice input is not available on this device."
        case .notAuthorized:
            "Allow microphone and speech recognition access, or type the details instead."
        }
    }
}

@MainActor
final class SpeechTranscriptionService: ObservableObject {
    @Published private(set) var isRecording = false

    private let recognizer: SFSpeechRecognizer?
    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var onTranscript: ((String) -> Void)?

    init(locale: Locale = .autoupdatingCurrent) {
        recognizer = SFSpeechRecognizer(locale: locale)
    }

    func start(onTranscript: @escaping (String) -> Void) async throws {
        if ProcessInfo.processInfo.arguments.contains("-CordialUITestFakeSpeech") {
            self.onTranscript = onTranscript
            isRecording = true
            onTranscript("Backyard birthday brunch on Saturday at 10am")
            return
        }

        guard recognizer?.isAvailable == true else {
            throw SpeechTranscriptionError.unavailable
        }
        guard await requestAuthorization() else {
            throw SpeechTranscriptionError.notAuthorized
        }

        stop()
        self.onTranscript = onTranscript

        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        self.request = request

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()
        isRecording = true

        task = recognizer?.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor in
                if let transcript = result?.bestTranscription.formattedString {
                    self?.onTranscript?(transcript)
                }
                if error != nil || result?.isFinal == true {
                    self?.cleanupRecognition(shouldCancelTask: false)
                }
            }
        }
    }

    func stop() {
        cleanupRecognition(shouldCancelTask: true)
    }

    private func cleanupRecognition(shouldCancelTask: Bool) {
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        request?.endAudio()
        if shouldCancelTask {
            task?.cancel()
        }
        request = nil
        task = nil
        onTranscript = nil
        isRecording = false
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            NSLog("Failed to deactivate audio session: %@", error.localizedDescription)
        }
    }

    private nonisolated func requestAuthorization() async -> Bool {
        async let speechAllowed = requestSpeechAuthorization()
        async let micAllowed = requestMicrophoneAuthorization()
        let allowed = await (speechAllowed, micAllowed)
        return allowed.0 && allowed.1
    }

    private nonisolated func requestSpeechAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }

    private nonisolated func requestMicrophoneAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            if #available(iOS 17.0, *) {
                AVAudioApplication.requestRecordPermission { allowed in
                    continuation.resume(returning: allowed)
                }
            } else {
                AVAudioSession.sharedInstance().requestRecordPermission { allowed in
                    continuation.resume(returning: allowed)
                }
            }
        }
    }
}
