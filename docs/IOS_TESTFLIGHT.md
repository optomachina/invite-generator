# Cordial Invites iOS

Native SwiftUI iOS app location:

```bash
cd apps/ios
xcodegen generate
open CordialInvites.xcodeproj
```

## Build

```bash
cd apps/ios
xcodegen generate
xcodebuild -project CordialInvites.xcodeproj -scheme CordialInvites -destination 'generic/platform=iOS Simulator' build
```

For CI-style compile verification without signing:

```bash
cd apps/ios
xcodebuild -project CordialInvites.xcodeproj -scheme CordialInvites -destination 'generic/platform=iOS' -derivedDataPath ./DerivedData CODE_SIGNING_ALLOWED=NO build-for-testing
```

## Configuration

The app currently defaults to a local mock renderer so the create flow works without backend credentials:

```text
MockInviteGenerationService
```

`OpenAIInviteGenerationService` is still present and can call the existing web backend at:

```text
https://invite-generator-two.vercel.app/api/generate
```

That endpoint keeps `OPENAI_API_KEY` server-side and requests:

- model: `gpt-image-2`
- quality: `low`
- size: `1024x1536`
- count: `1`

To point the app at another backend, change `API_BASE_URL` in:

```text
apps/ios/project.yml
```

Then wire the app initializer in:

```text
apps/ios/CordialInvites/App/CordialInvitesApp.swift
```

## Product Flow

Current native flow:

1. First-launch intro, skippable and replayable from Account.
2. Create tab with text prompt, voice button, and event chips.
3. Deterministic extraction into editable event and RSVP fields.
4. Output format and style selection.
5. Local mock invite generation with progress states.
6. Result screen with edit, quick edit chips, regenerate, version history, save draft, share preview, and package selection stubs.
7. Gallery tab reopens saved previews/drafts from local storage.
8. Account tab stores local defaults.

Known placeholders:
- Sign-in
- Hosted RSVP publishing
- Package billing
- PDF export
- Inspiration image upload
- Privacy/delete account actions

Billing note: Stripe, Apple IAP, checkout, and paid entitlements are intentionally not wired in the current iOS vertical slice.

## TestFlight

TestFlight requires an active Apple Developer Program account with App Store Connect access.
With that account signed into Xcode:

1. Open `apps/ios/CordialInvites.xcodeproj`.
2. Select the `CordialInvites` target.
3. Set the signing team.
4. Use bundle ID `com.cordialinvites.app`.
5. Product → Archive.
6. Distribute App → App Store Connect → Upload.
7. In App Store Connect, add the uploaded build to TestFlight.

Without a paid Apple Developer Program account, the app can be built and run locally from Xcode, but a TestFlight link cannot be created.

Current local credential check:

```bash
security find-identity -v -p codesigning
```

If this returns `0 valid identities found`, Xcode cannot sign an App Store/TestFlight archive yet. Sign into a paid Apple Developer team in Xcode, let Xcode create/download signing certificates, then archive from Xcode or rerun:

```bash
cd apps/ios
xcodebuild -project CordialInvites.xcodeproj -scheme CordialInvites -destination 'generic/platform=iOS' -archivePath ./build/CordialInvites.xcarchive archive
```
