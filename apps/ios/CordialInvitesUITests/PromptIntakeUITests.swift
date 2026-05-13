import XCTest

final class PromptIntakeUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testPromptFieldAcceptsTypingAndEnablesGeneration() throws {
        let app = XCUIApplication()
        app.launch()

        let promptField = app.descendants(matching: .any)["invitePromptField"]
        XCTAssertTrue(promptField.waitForExistence(timeout: 5))

        promptField.tap()
        app.typeText("Backyard birthday brunch on Saturday at 10am")

        XCTAssertTrue(app.buttons["Design 1 invite"].waitForExistence(timeout: 2))
        XCTAssertTrue(app.buttons["Design 1 invite"].isEnabled)
    }

    func testVoiceButtonGivesVisibleFeedback() throws {
        let app = XCUIApplication()
        app.launch()

        let voiceButton = app.buttons["voiceInputButton"]
        XCTAssertTrue(voiceButton.waitForExistence(timeout: 5))

        voiceButton.tap()

        let voiceFeedback = app.staticTexts["Requesting voice access..."]
        let permissionFeedback = app.staticTexts["Allow Speech Recognition access, or type the details instead."]
        let listeningFeedback = app.staticTexts["Listening..."]

        XCTAssertTrue(
            voiceFeedback.waitForExistence(timeout: 1) ||
                permissionFeedback.waitForExistence(timeout: 3) ||
                listeningFeedback.waitForExistence(timeout: 3)
        )
    }
}
