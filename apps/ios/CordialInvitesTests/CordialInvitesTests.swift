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
}
