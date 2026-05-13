import XCTest

final class PromptIntakeUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testPromptFieldAcceptsTypingAndEnablesGeneration() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFakeSpeech"]
        app.launch()

        let promptField = app.descendants(matching: .any)["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 5))

        promptField.tap()
        app.typeText("Backyard birthday brunch on Saturday at 10am")

        XCTAssertTrue(app.buttons["Design 1 invite"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["Design 1 invite"].isEnabled)
    }

    @MainActor
    func testVoiceButtonGivesVisibleFeedback() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFakeSpeech"]
        app.launch()
        addUIInterruptionMonitor(withDescription: "Voice permissions") { alert in
            if alert.buttons["Allow"].exists {
                alert.buttons["Allow"].tap()
                return true
            }
            if alert.buttons["OK"].exists {
                alert.buttons["OK"].tap()
                return true
            }
            return false
        }

        let voiceButton = app.buttons["voiceInputButton"]
        XCTAssertTrue(voiceButton.waitForExistence(timeout: 5))

        voiceButton.tap()

        XCTAssertTrue(hasVoiceFeedback(in: app))
        XCTAssertTrue(app.buttons["Design 1 invite"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["Design 1 invite"].isEnabled)
    }

    @MainActor
    private func hasVoiceFeedback(in app: XCUIApplication) -> Bool {
        let voiceFeedback = app.staticTexts["Requesting voice access..."]
        let unavailableFeedback = app.staticTexts["Voice input is not available on this device."]
        let permissionFeedback = app.staticTexts["Allow Speech Recognition access, or type the details instead."]
        let microphoneFeedback = app.staticTexts["Allow microphone access, or type the details instead."]
        let combinedPermissionFeedback = app.staticTexts["Allow microphone and speech recognition access, or type the details instead."]
        let listeningFeedback = app.staticTexts["Listening..."]

        return listeningFeedback.waitForExistence(timeout: 2) ||
            voiceFeedback.waitForExistence(timeout: 1) ||
            unavailableFeedback.waitForExistence(timeout: 2) ||
            permissionFeedback.waitForExistence(timeout: 2) ||
            microphoneFeedback.waitForExistence(timeout: 2) ||
            combinedPermissionFeedback.waitForExistence(timeout: 2)
    }
}
