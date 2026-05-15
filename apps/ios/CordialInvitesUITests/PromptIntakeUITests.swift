import XCTest

final class PromptIntakeUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testPromptFieldAcceptsTypingAndEnablesGeneration() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFakeSpeech", "-CordialSkipIntro"]
        app.launch()

        let promptField = app.textFields["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 5))
        let reviewButton = app.buttons["Review Details"]
        XCTAssertTrue(reviewButton.waitForExistence(timeout: 2))
        XCTAssertFalse(reviewButton.isEnabled)

        promptField.tap()
        app.typeText("Backyard birthday brunch on Saturday at 10am")

        XCTAssertTrue(reviewButton.isEnabled)
    }

    @MainActor
    func testVoiceButtonGivesVisibleFeedback() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFakeSpeech", "-CordialSkipIntro"]
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
        let reviewButton = app.buttons["Review Details"]
        XCTAssertTrue(reviewButton.waitForExistence(timeout: 2))
        XCTAssertTrue(reviewButton.isEnabled)
    }

    @MainActor
    func testVoiceButtonCanToggleOff() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFakeSpeech", "-CordialSkipIntro"]
        app.launch()

        let voiceButton = app.buttons["voiceInputButton"]
        XCTAssertTrue(voiceButton.waitForExistence(timeout: 5))

        voiceButton.tap()
        XCTAssertTrue(app.buttons["Stop recording"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.staticTexts["Listening..."].waitForExistence(timeout: 2))

        app.buttons["Stop recording"].tap()
        XCTAssertTrue(app.buttons["Start voice input"].waitForExistence(timeout: 2))
        XCTAssertFalse(app.staticTexts["Listening..."].exists)
        XCTAssertFalse(app.staticTexts["Tap mic when done"].exists)
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
        app.launchArguments = ["-CordialUITestFakeGeneration", "-CordialSkipIntro"]
        app.launch()

        enterPromptAndOpenStyle(app)

        let generateButton = app.buttons["Generate Preview"]
        XCTAssertTrue(generateButton.waitForExistence(timeout: 2))
        XCTAssertTrue(generateButton.isEnabled)
        tapWhenVisible(generateButton, in: app)

        XCTAssertTrue(app.images["invitePreviewImage"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["Use This"].waitForExistence(timeout: 2))
    }

    @MainActor
    func testGenerationErrorDetailsCanBeCopied() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-CordialUITestFailGeneration", "-CordialSkipIntro"]
        app.launch()

        enterPromptAndOpenStyle(app)

        let generateButton = app.buttons["Generate Preview"]
        XCTAssertTrue(generateButton.waitForExistence(timeout: 2))
        XCTAssertTrue(generateButton.isEnabled)
        tapWhenVisible(generateButton, in: app)

        let copyDetailsButton = app.buttons["copyErrorDetailsButton"]
        XCTAssertTrue(copyDetailsButton.waitForExistence(timeout: 5))
        copyDetailsButton.tap()
        XCTAssertTrue(app.buttons["Copied details"].waitForExistence(timeout: 2))
    }

    @MainActor
    private func enterPromptAndOpenStyle(_ app: XCUIApplication) {
        let promptField = app.textFields["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 5))
        promptField.tap()
        app.typeText("Xavier is turning 15 and having a party at whiskey roads on April 24th at 6pm.")

        let reviewButton = app.buttons["Review Details"]
        XCTAssertTrue(reviewButton.waitForExistence(timeout: 2))
        XCTAssertTrue(reviewButton.isEnabled)
        tapWhenVisible(reviewButton, in: app)

        let chooseStyleButton = app.buttons["Choose Style"]
        XCTAssertTrue(chooseStyleButton.waitForExistence(timeout: 2))
        tapWhenVisible(chooseStyleButton, in: app)
    }

    @MainActor
    private func tapWhenVisible(_ element: XCUIElement, in app: XCUIApplication) {
        for _ in 0..<8 where !element.isHittable {
            app.swipeUp()
        }
        XCTAssertTrue(element.isHittable)
        element.tap()
    }
}
