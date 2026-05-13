import SwiftUI

@main
struct CordialInvitesApp: App {
    @StateObject private var appState = InviteStudioState()

    var body: some Scene {
        WindowGroup {
            ContentView(state: appState)
        }
    }
}
