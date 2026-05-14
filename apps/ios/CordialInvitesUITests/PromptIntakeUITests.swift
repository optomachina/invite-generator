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

        let promptField = app.textFields["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 5))
        let designButton = app.buttons["Design 1 invite"]
        XCTAssertTrue(designButton.waitForExistence(timeout: 2))
        XCTAssertFalse(designButton.isEnabled)

        promptField.tap()
        app.typeText("Backyard birthday brunch on Saturday at 10am")

        XCTAssertTrue(designButton.isEnabled)
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
        let promptField = app.textFields["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 2))
        XCTAssertEqual(promptField.value as? String, "Backyard birthday brunch on Saturday at 10am")
        let designButton = app.buttons["Design 1 invite"]
        XCTAssertTrue(designButton.waitForExistence(timeout: 2))
        XCTAssertTrue(designButton.isEnabled)
    }

    @MainActor
    private func hasVoiceFeedback(in app: XCUIApplication) -> Bool {
        let feedbackTimeout: TimeInterval = 2
        let voiceFeedback = app.staticTexts["Requesting voice access..."]
        let unavailableFeedback = app.staticTexts["Voice input is not available on this device."]
        let permissionFeedback = app.staticTexts["Allow Speech Recognition access, or type the details instead."]
        let microphoneFeedback = app.staticTexts["Allow microphone access, or type the details instead."]
        let combinedPermissionFeedback = app.staticTexts["Allow microphone and speech recognition access, or type the details instead."]
        let listeningFeedback = app.staticTexts["Listening..."]

        return listeningFeedback.waitForExistence(timeout: feedbackTimeout) ||
            voiceFeedback.waitForExistence(timeout: feedbackTimeout) ||
            unavailableFeedback.waitForExistence(timeout: feedbackTimeout) ||
            permissionFeedback.waitForExistence(timeout: feedbackTimeout) ||
            microphoneFeedback.waitForExistence(timeout: feedbackTimeout) ||
            combinedPermissionFeedback.waitForExistence(timeout: feedbackTimeout)
    }

    @MainActor
    func testPromptCanGenerateInviteThroughUI() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFakeGeneration"]
        app.launch()

        let promptField = app.textFields["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 5))
        promptField.tap()
        app.typeText("Xavier is turning 15 and having a party at whiskey roads on April 24th at 6pm.")

        let designButton = app.buttons["Design 1 invite"]
        XCTAssertTrue(designButton.waitForExistence(timeout: 2))
        XCTAssertTrue(designButton.isEnabled)
        designButton.tap()

        XCTAssertTrue(app.buttons["Share Invite"].waitForExistence(timeout: 5))
    }

    @MainActor
    func testGenerationErrorDetailsCanBeCopied() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFailGeneration"]
        app.launch()

        let promptField = app.textFields["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 5))
        promptField.tap()
        app.typeText("Xavier is turning 15 and having a party at whiskey roads on April 24th at 6pm.")

        let designButton = app.buttons["Design 1 invite"]
        XCTAssertTrue(designButton.waitForExistence(timeout: 2))
        designButton.tap()

        let copyDetailsButton = app.buttons["copyErrorDetailsButton"]
        XCTAssertTrue(copyDetailsButton.waitForExistence(timeout: 5))
        copyDetailsButton.tap()
        XCTAssertTrue(app.buttons["Copied details"].waitForExistence(timeout: 2))
    }
}
