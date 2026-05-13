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

The app calls the existing web backend at:

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
