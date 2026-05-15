import SwiftUI
import UIKit

struct ContentView: View {
    @ObservedObject var state: InviteStudioState
    @AppStorage("cordial.hasSeenIntro.v1") private var hasSeenIntro = false
    @State private var showIntro = false

    var body: some View {
        TabView {
            NavigationStack {
                CreateView(state: state)
                    .navigationTitle("Create")
            }
            .tabItem {
                Label("Create", systemImage: "sparkles")
            }

            NavigationStack {
                GalleryView(state: state)
                    .navigationTitle("Gallery")
            }
            .tabItem {
                Label("Gallery", systemImage: "photo.on.rectangle")
            }

            NavigationStack {
                AccountView(state: state, replayIntro: {
                    hasSeenIntro = false
                    showIntro = true
                })
                .navigationTitle("Account")
            }
            .tabItem {
                Label("Account", systemImage: "person.crop.circle")
            }
        }
        .tint(Brand.clay)
        .onAppear {
            if ProcessInfo.processInfo.arguments.contains("-CordialSkipIntro") {
                hasSeenIntro = true
                showIntro = false
            } else {
                showIntro = !hasSeenIntro
            }
        }
        .fullScreenCover(isPresented: $showIntro) {
            IntroView {
                hasSeenIntro = true
                showIntro = false
            }
        }
    }
}

private struct IntroView: View {
    let onDone: () -> Void

    private let cards = [
        ("Tell Cordial Invites what you need.", "Type or voice-note the occasion, names, date, venue, RSVP notes, and tone."),
        ("Review the event details.", "Cordial extracts the likely fields and leaves everything editable before generation."),
        ("Pick a style, generate, edit, and share.", "Start with a mock preview now; backend image generation and billing stay behind clean seams.")
    ]

    var body: some View {
        ZStack {
            Brand.cream.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 24) {
                Spacer(minLength: 28)
                Text("Cordial Invites")
                    .font(.system(size: 42, weight: .semibold, design: .serif))
                    .foregroundStyle(Brand.ink)
                VStack(spacing: 12) {
                    ForEach(cards, id: \.0) { card in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(card.0)
                                .font(.system(.title3, design: .serif, weight: .semibold))
                            Text(card.1)
                                .font(.callout)
                                .foregroundStyle(Brand.ink.opacity(0.68))
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(18)
                        .background(Brand.paper)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                }
                Spacer()
                Button(action: onDone) {
                    Text("Start Creating")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(Brand.ink)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                Button("Skip intro", action: onDone)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(Brand.ink.opacity(0.68))
                    .frame(maxWidth: .infinity)
            }
            .padding(22)
        }
    }
}

private struct CreateView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        ZStack {
            Brand.cream.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 18) {
                    FlowHeader(state: state)

                    switch state.createStep {
                    case .prompt:
                        PromptStepView(state: state)
                    case .details:
                        DetailsStepView(state: state)
                    case .style:
                        StyleStepView(state: state)
                    case .generating:
                        GeneratingStepView(state: state)
                    case .result:
                        ResultStepView(state: state)
                    case .packages:
                        PackageStepView(state: state)
                    }
                }
                .padding(18)
                .padding(.bottom, 28)
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    state.startNewInvite()
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("New invite")
            }
        }
    }
}

private struct FlowHeader: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Cordial Invites")
                .font(.system(size: 34, weight: .semibold, design: .serif))
                .foregroundStyle(Brand.ink)
            Text(subtitle)
                .font(.callout)
                .foregroundStyle(Brand.ink.opacity(0.68))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var subtitle: String {
        switch state.createStep {
        case .prompt:
            "Start with text, voice, or a common event chip."
        case .details:
            "Confirm the extracted details before design."
        case .style:
            "Choose the output format and visual direction."
        case .generating:
            "Cordial is assembling a usable preview."
        case .result:
            "Edit, regenerate, save, or continue to package options."
        case .packages:
            "Package selection is visible; billing is intentionally disabled."
        }
    }
}

private struct PromptStepView: View {
    @ObservedObject var state: InviteStudioState
    @FocusState private var isPromptFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            TextField(
                "",
                text: $state.promptText,
                prompt: Text(state.promptStarter).foregroundStyle(Brand.ink.opacity(0.38)),
                axis: .vertical
            )
            .focused($isPromptFocused)
            .accessibilityIdentifier("invitePromptField")
            .font(.system(.title3, design: .serif))
            .foregroundStyle(Brand.ink)
            .lineSpacing(5)
            .lineLimit(6...12)
            .textInputAutocapitalization(.sentences)
            .frame(maxWidth: .infinity, minHeight: 190, alignment: .topLeading)
            .padding(.leading, 16)
            .padding(.trailing, 88)
            .padding(.vertical, 18)
            .background(Brand.paper)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Brand.line.opacity(0.85), lineWidth: 1)
            }
            .onTapGesture {
                isPromptFocused = true
            }
            .overlay(alignment: .bottomTrailing) {
                Button {
                    state.toggleRecording()
                } label: {
                    Image(systemName: state.isRecording ? "stop.fill" : "mic.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 64, height: 64)
                        .background(state.isRecording ? Brand.clay : Brand.ink)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("voiceInputButton")
                .accessibilityLabel(state.isRecording ? "Stop recording" : "Start voice input")
                .padding(14)
            }

            if state.isRecording || state.voiceMessage != nil {
                RecordingIndicator(message: state.voiceMessage ?? "Listening...")
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Examples")
                    .font(.caption.weight(.semibold))
                    .tracking(2)
                    .textCase(.uppercase)
                    .foregroundStyle(Brand.ink.opacity(0.48))

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 140), spacing: 10)], spacing: 10) {
                    ForEach(Brand.eventTypes, id: \.self) { value in
                        ChipButton(title: value, isSelected: state.selectedPromptStarterChip == value) {
                            state.applyPromptStarter(value)
                        }
                    }
                }
            }

            PrimaryButton(title: "Review Details", icon: "arrow.right", isDisabled: !state.canExtractDetails) {
                state.extractDetails()
            }
            .accessibilityIdentifier("reviewDetailsButton")

            ErrorPanel(message: state.errorMessage, details: state.errorLog)
        }
        .cardSurface()
    }
}

private struct DetailsStepView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Confirm Details", subtitle: "Missing fields are optional unless they matter to the invite.")

            VStack(spacing: 10) {
                AppTextField("Event type", text: $state.details.eventType, icon: "sparkles")
                AppTextField("Event title", text: $state.details.eventTitle, icon: "textformat")
                AppTextField("Honoree / guest of honor", text: $state.details.honoree, icon: "person")
                AppTextField("Host name", text: $state.details.hostName, icon: "person.2")
                HStack(spacing: 10) {
                    AppTextField("Date", text: $state.details.date, icon: "calendar")
                    AppTextField("Start time", text: $state.details.startTime, icon: "clock")
                }
                AppTextField("End time", text: $state.details.endTime, icon: "clock.badge")
                AppTextField("Venue name", text: $state.details.venueName, icon: "building.2")
                AppTextField("Address", text: $state.details.address, icon: "mappin.and.ellipse")
                AppTextField("RSVP contact", text: $state.details.rsvpContact, icon: "envelope")
                AppTextField("RSVP deadline", text: $state.details.rsvpDeadline, icon: "calendar.badge.clock")
                AppTextField("Dress code", text: $state.details.dressCode, icon: "tshirt")
                AppTextField("Registry/link", text: $state.details.registryLink, icon: "link")
                AppTextField("Plus-one rules", text: $state.details.plusOneRules, icon: "person.crop.circle.badge.plus")
                AppTextField("Max guests", text: $state.details.maxGuests, icon: "number")
            }

            VStack(alignment: .leading, spacing: 10) {
                Toggle("RSVP enabled", isOn: $state.details.rsvp.isEnabled)
                Toggle("Allow yes/no/maybe", isOn: $state.details.rsvp.allowMaybe)
                Toggle("Allow plus-ones", isOn: $state.details.rsvp.allowPlusOnes)
                Toggle("Ask for guest note", isOn: $state.details.rsvp.askForGuestNote)
                Toggle("Ask for meal choice", isOn: $state.details.rsvp.askForMealChoice)
                AppTextField("Max party size", text: $state.details.rsvp.maxPartySize, icon: "person.3")
            }
            .font(.subheadline)
            .foregroundStyle(Brand.ink)

            VStack(alignment: .leading, spacing: 8) {
                Label("Special notes", systemImage: "note.text")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Brand.ink.opacity(0.62))
                TextEditor(text: $state.details.specialNotes)
                    .frame(minHeight: 90)
                    .padding(10)
                    .scrollContentBackground(.hidden)
                    .background(Brand.paper)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }

            Picker("Output format", selection: $state.outputFormat) {
                ForEach(OutputFormat.allCases) { format in
                    Text(format.rawValue).tag(format)
                }
            }
            .pickerStyle(.menu)

            HStack(spacing: 10) {
                SecondaryButton(title: "Back", icon: "chevron.left") {
                    state.createStep = .prompt
                }
                PrimaryButton(title: "Choose Style", icon: "paintpalette", isDisabled: false) {
                    state.continueToStyle()
                }
            }
        }
        .cardSurface()
    }
}

private struct StyleStepView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Style & Format", subtitle: "Keep it simple: one format, one direction, optional notes.")

            Picker("Output format", selection: $state.outputFormat) {
                ForEach(OutputFormat.allCases) { format in
                    Text(format.rawValue).tag(format)
                }
            }
            .pickerStyle(.segmented)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 10)], spacing: 10) {
                ForEach(InviteStyle.allCases) { style in
                    Button {
                        state.selectedStyle = style
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            Image(systemName: icon(for: style))
                                .font(.title3)
                            Text(style.rawValue)
                                .font(.headline)
                                .lineLimit(2)
                                .minimumScaleFactor(0.82)
                            Text(style.descriptor)
                                .font(.caption)
                                .foregroundStyle(Brand.ink.opacity(0.62))
                                .lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, minHeight: 112, alignment: .leading)
                        .padding(14)
                        .background(state.selectedStyle == style ? Brand.ink : Brand.paper)
                        .foregroundStyle(state.selectedStyle == style ? .white : Brand.ink)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Palette")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Brand.ink.opacity(0.62))
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 10)], spacing: 10) {
                    ForEach(Brand.vibes, id: \.self) { palette in
                        ChipButton(title: palette, isSelected: state.selectedPalette == palette) {
                            state.selectedPalette = palette
                        }
                    }
                }
            }

            AppTextField("Avoid", text: $state.avoidNotes, icon: "nosign")
            AppTextField("Inspiration image placeholder", text: $state.inspirationImageNote, icon: "photo")
            AppTextField("Advanced style notes", text: $state.advancedStyleNotes, icon: "wand.and.stars")

            HStack(spacing: 10) {
                SecondaryButton(title: "Details", icon: "chevron.left") {
                    state.createStep = .details
                }
                PrimaryButton(title: "Generate Preview", icon: "sparkles", isDisabled: !state.canGenerate) {
                    Task { await state.generate() }
                }
                .accessibilityIdentifier("generatePreviewButton")
            }

            ErrorPanel(message: state.errorMessage, details: state.errorLog)
        }
        .cardSurface()
    }

    private func icon(for style: InviteStyle) -> String {
        switch style {
        case .elegant: "sparkle"
        case .modernMinimal: "square.grid.2x2"
        case .floral: "camera.macro"
        case .western: "sun.max"
        case .kidsCartoon: "paintpalette"
        case .luxuryBlackGold: "crown"
        case .boho: "leaf"
        case .retro: "record.circle"
        case .religiousTraditional: "building.columns"
        case .photoBased: "photo"
        }
    }
}

private struct GeneratingStepView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.35)
                .tint(Brand.clay)
            Text(state.generationProgress.isEmpty ? "Preparing preview" : state.generationProgress)
                .font(.system(.title2, design: .serif, weight: .semibold))
                .foregroundStyle(Brand.ink)
            Text("The current build uses a local renderer so the flow works without backend credentials.")
                .font(.footnote)
                .foregroundStyle(Brand.ink.opacity(0.62))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .frame(minHeight: 360)
        .cardSurface()
    }
}

private struct ResultStepView: View {
    @ObservedObject var state: InviteStudioState

    private let quickEdits = [
        "Bigger text", "More formal", "More playful", "Change colors",
        "Add photo", "Remove clutter", "Try another layout"
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Invite Preview", subtitle: state.currentInvite?.details.displayTitle ?? "Generated preview")

            ZStack {
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Brand.paper)
                    .overlay {
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .stroke(Brand.line, lineWidth: 1)
                    }
                if let image = state.selectedImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .padding(10)
                        .accessibilityIdentifier("invitePreviewImage")
                } else {
                    EmptyPreview()
                }
            }
            .aspectRatio(5.0 / 7.0, contentMode: .fit)

            HStack(spacing: 10) {
                PrimaryButton(title: "Use This", icon: "checkmark", isDisabled: state.selectedImage == nil) {
                    state.useThisInvite()
                }
                SecondaryButton(title: "Regenerate", icon: "arrow.clockwise") {
                    Task { await state.regenerate() }
                }
            }

            HStack(spacing: 10) {
                SecondaryButton(title: "Change style", icon: "paintpalette") {
                    state.createStep = .style
                }
                SecondaryButton(title: "Fix details", icon: "square.and.pencil") {
                    state.createStep = .details
                }
            }

            SecondaryButton(title: "Save draft", icon: "tray.and.arrow.down") {
                state.saveDraft()
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Quick edits")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Brand.ink.opacity(0.62))
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 126), spacing: 8)], spacing: 8) {
                    ForEach(quickEdits, id: \.self) { value in
                        ChipButton(title: value, isSelected: state.editInstruction == value) {
                            state.applyQuickEdit(value)
                        }
                    }
                }

                HStack(spacing: 10) {
                    AppTextField("Describe an edit", text: $state.editInstruction, icon: "text.bubble")
                    Button {
                        Task { await state.submitEdit() }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Brand.clay)
                    .accessibilityLabel("Submit edit")
                }
            }

            if let revisions = state.currentInvite?.revisions, revisions.count > 1 {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Version history")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(Brand.ink.opacity(0.62))
                    ForEach(revisions) { revision in
                        Button {
                            state.selectRevision(revision)
                        } label: {
                            HStack {
                                Text(revision.instruction)
                                    .font(.footnote.weight(.medium))
                                    .lineLimit(1)
                                Spacer()
                                if state.selectedRevisionID == revision.id {
                                    Image(systemName: "checkmark.circle.fill")
                                }
                            }
                            .foregroundStyle(Brand.ink)
                            .padding(10)
                            .background(Brand.paper)
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            if let image = state.selectedImage {
                ShareLink(item: Image(uiImage: image), preview: SharePreview("Cordial Invite", image: Image(uiImage: image))) {
                    Label("Share Preview", systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(Brand.sage)
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            }

            InfoMessage(text: state.packageMessage)
            ErrorPanel(message: state.errorMessage, details: state.errorLog)
        }
        .cardSurface()
    }
}

private struct PackageStepView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Choose Package", subtitle: "Billing is intentionally stubbed for this pass.")

            ForEach(state.packages) { package in
                Button {
                    state.choosePackage(package)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 8) {
                                Text(package.packageName)
                                    .font(.headline)
                                if package.packageName.contains("Hosted") {
                                    Text("Recommended")
                                        .font(.caption.weight(.bold))
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Brand.clay.opacity(0.14))
                                        .clipShape(Capsule())
                                }
                            }
                            Text(package.priceLabel)
                                .font(.subheadline)
                                .foregroundStyle(Brand.ink.opacity(0.62))
                        }
                        Spacer()
                        Image(systemName: "lock")
                            .foregroundStyle(Brand.clay)
                    }
                    .padding(14)
                    .background(Brand.paper)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            InfoMessage(text: state.packageMessage)

            SecondaryButton(title: "Back to preview", icon: "chevron.left") {
                state.createStep = .result
            }
        }
        .cardSurface()
    }
}

private struct GalleryView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        ZStack {
            Brand.cream.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if state.gallery.isEmpty {
                        EmptyState(
                            icon: "photo.on.rectangle.angled",
                            title: "No saved invites yet.",
                            subtitle: "Generate a preview or save a draft and it will appear here."
                        )
                    } else {
                        ForEach(state.gallery) { invite in
                            Button {
                                state.openGalleryInvite(invite)
                            } label: {
                                GalleryRow(invite: invite)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(18)
            }
        }
    }
}

private struct GalleryRow: View {
    let invite: InviteDesign

    var body: some View {
        HStack(spacing: 14) {
            if let data = invite.selectedRevision?.imageData,
               let image = UIImage(data: data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 78, height: 104)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            } else {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Brand.paper)
                    .frame(width: 78, height: 104)
                    .overlay(Image(systemName: "envelope.open"))
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(invite.details.displayTitle)
                    .font(.headline)
                    .foregroundStyle(Brand.ink)
                Text(invite.details.dateLine.ifEmpty("Date not set"))
                    .font(.subheadline)
                    .foregroundStyle(Brand.ink.opacity(0.62))
                Text(invite.status.rawValue)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Brand.clay)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(Brand.ink.opacity(0.42))
        }
        .padding(12)
        .background(.white.opacity(0.62))
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

private struct AccountView: View {
    @ObservedObject var state: InviteStudioState
    let replayIntro: () -> Void

    var body: some View {
        ZStack {
            Brand.cream.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    SectionHeader(title: "Account", subtitle: "Local settings now; sign-in and hosting come later.")

                    VStack(spacing: 10) {
                        Label("Sign-in placeholder", systemImage: "person.crop.circle.badge.questionmark")
                        AppTextField("Default RSVP contact", text: $state.accountDefaults.defaultRSVPContact, icon: "envelope")
                        AppTextField("Preferred colors", text: $state.accountDefaults.preferredColors, icon: "paintpalette")

                        Picker("Preferred style", selection: $state.accountDefaults.preferredStyle) {
                            ForEach(InviteStyle.allCases) { style in
                                Text(style.rawValue).tag(style)
                            }
                        }

                        Picker("Default output", selection: $state.accountDefaults.defaultOutputFormat) {
                            ForEach(OutputFormat.allCases) { format in
                                Text(format.rawValue).tag(format)
                            }
                        }

                        PrimaryButton(title: "Save defaults", icon: "checkmark", isDisabled: false) {
                            state.updateAccountDefaults()
                        }
                        SecondaryButton(title: "Replay intro", icon: "play.circle", action: replayIntro)
                        SecondaryButton(title: "Privacy placeholder", icon: "hand.raised") {
                            state.showPrivacyPlaceholder()
                        }
                        SecondaryButton(title: "Delete account placeholder", icon: "trash") {
                            state.showDeleteAccountPlaceholder()
                        }
                    }
                    .font(.subheadline)
                    .foregroundStyle(Brand.ink)

                    InfoMessage(text: state.packageMessage)
                }
                .padding(18)
                .cardSurface()
                .padding(18)
            }
        }
    }
}

private struct RecordingIndicator: View {
    var message: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "waveform")
                .font(.headline)
                .foregroundStyle(Brand.clay)
            Text(message)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Brand.ink)
            Spacer()
            Text("Tap mic when done")
                .font(.caption)
                .foregroundStyle(Brand.ink.opacity(0.58))
        }
        .padding(.horizontal, 14)
        .frame(height: 48)
        .background(Brand.paper.opacity(0.62))
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct SectionHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(.title2, design: .serif, weight: .semibold))
                .foregroundStyle(Brand.ink)
            Text(subtitle)
                .font(.caption)
                .foregroundStyle(Brand.ink.opacity(0.62))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct AppTextField: View {
    let title: String
    @Binding var text: String
    let icon: String

    init(_ title: String, text: Binding<String>, icon: String) {
        self.title = title
        self._text = text
        self.icon = icon
    }

    var body: some View {
        HStack(spacing: 9) {
            Image(systemName: icon)
                .font(.footnote)
                .foregroundStyle(Brand.clay)
                .frame(width: 18)
            TextField(title, text: $text)
                .textInputAutocapitalization(.words)
        }
        .font(.body)
        .padding(.horizontal, 12)
        .frame(minHeight: 48)
        .background(Brand.paper)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Brand.line.opacity(0.75), lineWidth: 1)
        }
    }
}

private struct PrimaryButton: View {
    let title: String
    let icon: String
    let isDisabled: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
        }
        .buttonStyle(.plain)
        .foregroundStyle(.white)
        .background(isDisabled ? Brand.clay.opacity(0.42) : Brand.clay)
        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
        .disabled(isDisabled)
    }
}

private struct SecondaryButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .frame(height: 46)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Brand.ink)
        .background(Brand.paper)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Brand.line.opacity(0.75), lineWidth: 1)
        }
    }
}

private struct ChipButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .lineLimit(1)
                .minimumScaleFactor(0.78)
                .foregroundStyle(isSelected ? .white : Brand.ink)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .padding(.horizontal, 10)
                .background(isSelected ? Brand.ink : Brand.paper.opacity(0.72))
                .clipShape(Capsule())
                .overlay {
                    Capsule().stroke(Brand.line.opacity(0.9), lineWidth: 1)
                }
        }
        .buttonStyle(.plain)
    }
}

private struct ErrorPanel: View {
    let message: String?
    let details: String?
    @State private var didCopy = false

    var body: some View {
        if let message {
            VStack(alignment: .leading, spacing: 10) {
                Label(message, systemImage: "exclamationmark.triangle.fill")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let details, !details.isEmpty {
                    Button {
                        UIPasteboard.general.string = details
                        didCopy = true
                    } label: {
                        Label(didCopy ? "Copied details" : "Copy details", systemImage: didCopy ? "checkmark" : "doc.on.doc")
                            .font(.footnote.weight(.semibold))
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Brand.ink)
                    .accessibilityIdentifier("copyErrorDetailsButton")
                }
            }
            .padding(12)
            .background(Color.red.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

private struct InfoMessage: View {
    let text: String?

    var body: some View {
        if let text, !text.isEmpty {
            Label(text, systemImage: "info.circle")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Brand.ink.opacity(0.72))
                .padding(12)
                .background(Brand.paper)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }
}

private struct EmptyPreview: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "envelope.open")
                .font(.system(size: 42, weight: .light))
                .foregroundStyle(Brand.clay)
            Text("Ready when the details are.")
                .font(.system(.title3, design: .serif, weight: .semibold))
            Text("Generate a preview to see the first draft.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .foregroundStyle(Brand.ink)
    }
}

private struct EmptyState: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 42, weight: .light))
                .foregroundStyle(Brand.clay)
            Text(title)
                .font(.system(.title3, design: .serif, weight: .semibold))
            Text(subtitle)
                .font(.footnote)
                .foregroundStyle(Brand.ink.opacity(0.62))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(28)
        .cardSurface()
    }
}

private extension View {
    func cardSurface() -> some View {
        self
            .padding(18)
            .background(.white.opacity(0.56))
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(.white.opacity(0.7), lineWidth: 1)
            }
    }
}

private extension String {
    func ifEmpty(_ fallback: String) -> String {
        trimmed.isEmpty ? fallback : self
    }
}
