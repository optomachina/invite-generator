import SwiftUI
import UIKit

@main
struct CordialInvitesApp: App {
    @StateObject private var appState: InviteStudioState

    init() {
        let service: InviteGenerationService
        if ProcessInfo.processInfo.arguments.contains("-CordialUITestFakeGeneration") {
            service = UITestInviteGenerationService()
        } else if ProcessInfo.processInfo.arguments.contains("-CordialUITestFailGeneration") {
            service = UITestFailingInviteGenerationService()
        } else {
            service = OpenAIInviteGenerationService()
        }
        _appState = StateObject(wrappedValue: InviteStudioState(service: service))
    }

    var body: some Scene {
        WindowGroup {
            ContentView(state: appState)
        }
    }
}

@MainActor
private final class UITestInviteGenerationService: InviteGenerationService {
    func generateInvite(prompt: String) async throws -> InviteGenerationResult {
        InviteGenerationResult(
            image: testImage(),
            prompt: "Generated prompt for UI test: \(prompt)",
            elapsedText: "0.1s"
        )
    }

    private func testImage() -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 500, height: 700))
        return renderer.image { context in
            UIColor(red: 0.98, green: 0.94, blue: 0.86, alpha: 1).setFill()
            context.fill(CGRect(x: 0, y: 0, width: 500, height: 700))
            UIColor(red: 0.45, green: 0.22, blue: 0.15, alpha: 1).setFill()
            context.fill(CGRect(x: 80, y: 96, width: 340, height: 12))
            context.fill(CGRect(x: 110, y: 150, width: 280, height: 8))
            context.fill(CGRect(x: 130, y: 510, width: 240, height: 8))
        }
    }
}

@MainActor
private final class UITestFailingInviteGenerationService: InviteGenerationService {
    func generateInvite(prompt _: String) async throws -> InviteGenerationResult {
        throw InviteGenerationError.badStatus(
            502,
            "Invite generation failed. Request ID: ui-test-request",
            #"{"error":"Invite generation failed.","detail":"UI test failure","requestId":"ui-test-request"}"#
        )
    }
}
