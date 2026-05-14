import SwiftUI
import UIKit

struct ContentView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        NavigationStack {
            ZStack {
                Brand.cream.ignoresSafeArea()
                ScrollView {
                    VStack(spacing: 22) {
                        HeroView()
                        PromptIntakeView(state: state)
                        ActionPanel(state: state)
                        ResultView(state: state)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 18)
                    .padding(.bottom, 36)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Cordial Invites")
                        .font(.system(.headline, design: .serif, weight: .semibold))
                        .foregroundStyle(Brand.ink)
                }
            }
        }
    }
}

private struct HeroView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tell us about your event.")
                .font(.system(size: 38, weight: .semibold, design: .serif))
                .foregroundStyle(Brand.ink)
                .fixedSize(horizontal: false, vertical: true)

            Text("Paste details or voice-note it. Cordial turns the moment into a tasteful 5x7 invite.")
                .font(.callout)
                .foregroundStyle(Brand.ink.opacity(0.72))
                .lineSpacing(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 6)
    }
}

private struct PromptIntakeView: View {
    @ObservedObject var state: InviteStudioState
    @FocusState private var isPromptFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            TextField(
                "",
                text: $state.promptText,
                prompt: Text(state.promptStarter)
                    .foregroundStyle(Brand.ink.opacity(0.38))
                    .italic(),
                axis: .vertical
            )
                .focused($isPromptFocused)
                .accessibilityIdentifier("invitePromptField")
                .font(.system(.title3, design: .serif))
                .foregroundStyle(Brand.ink)
                .lineSpacing(5)
                .lineLimit(5...10)
                .textInputAutocapitalization(.sentences)
                .autocorrectionDisabled(false)
                .submitLabel(.done)
                .frame(maxWidth: .infinity, minHeight: 172, alignment: .topLeading)
                .padding(.leading, 16)
                .padding(.trailing, 88)
                .padding(.vertical, 18)
                .background(Brand.paper)
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .stroke(Brand.line.opacity(0.85), lineWidth: 1)
                }
                .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
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
                            .contentShape(Circle())
                            .shadow(color: Brand.ink.opacity(0.12), radius: 8, y: 4)
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
                Text("Or start with a moment")
                    .font(.caption.weight(.semibold))
                    .tracking(3)
                    .textCase(.uppercase)
                    .foregroundStyle(Brand.ink.opacity(0.45))

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 132), spacing: 10)], alignment: .leading, spacing: 10) {
                    ForEach(Brand.eventTypes, id: \.self) { value in
                        let isSelected = state.selectedPromptStarterChip == value
                        Button {
                            state.applyPromptStarter(value)
                        } label: {
                            Text(value)
                                .font(.subheadline.weight(.medium))
                                .lineLimit(1)
                                .minimumScaleFactor(0.82)
                                .foregroundStyle(isSelected ? .white : Brand.ink)
                                .frame(maxWidth: .infinity)
                                .frame(height: 42)
                                .padding(.horizontal, 10)
                                .background(isSelected ? Brand.ink : Brand.paper.opacity(0.55))
                                .clipShape(Capsule())
                                .overlay {
                                    Capsule().stroke(Brand.line.opacity(0.9), lineWidth: 1)
                                }
                        }
                        .buttonStyle(.plain)
                    }
                }
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

private struct StructuredIntakeView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            SectionHeader(title: "Event Details", subtitle: "Start with the facts, then add taste.")

            ChipRow(title: "Occasion", values: Brand.eventTypes, selected: state.selectedEventType) { value in
                state.applyEventType(value)
            }

            VStack(spacing: 12) {
                AppTextField("Honoree or host", text: $state.intake.honoree, icon: "person.text.rectangle")
                AppTextField("Occasion", text: $state.intake.event, icon: "sparkles")
                HStack(spacing: 10) {
                    AppTextField("Date", text: $state.intake.date, icon: "calendar")
                    AppTextField("Time", text: $state.intake.time, icon: "clock")
                }
                AppTextField("Location", text: $state.intake.location, icon: "mappin.and.ellipse")
            }

            ChipRow(title: "Direction", values: Brand.vibes, selected: state.selectedVibe) { value in
                state.applyVibe(value)
            }

            VStack(alignment: .leading, spacing: 8) {
                Label("Style notes", systemImage: "paintpalette")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Brand.ink.opacity(0.62))

                TextEditor(text: $state.intake.vibe)
                    .font(.body)
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 92)
                    .padding(12)
                    .background(Brand.paper)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Brand.line.opacity(0.75), lineWidth: 1)
                    }
            }
        }
        .cardSurface()
    }
}

private struct ActionPanel: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(spacing: 14) {
            Button {
                Task { await state.generate() }
            } label: {
                HStack(spacing: 10) {
                    if state.isGenerating {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "arrow.right")
                    }
                    Text(state.isGenerating ? "Designing your invite" : "Design 1 invite")
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
            }
            .buttonStyle(.plain)
            .foregroundStyle(.white)
            .background(state.canGenerate ? Brand.clay : Brand.clay.opacity(0.45))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .disabled(!state.canGenerate)

            HStack(spacing: 8) {
                Image(systemName: "checkmark.seal")
                Text("Free to preview. One low-quality OpenAI image generation per run.")
            }
            .font(.caption)
            .foregroundStyle(Brand.ink.opacity(0.58))
            .frame(maxWidth: .infinity, alignment: .leading)

            if let error = state.errorMessage {
                GenerationErrorView(message: error, details: state.errorLog)
            }
        }
        .cardSurface()
    }
}

private struct GenerationErrorView: View {
    let message: String
    let details: String?
    @State private var didCopy = false

    var body: some View {
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

                DisclosureGroup("Error details") {
                    ScrollView {
                        Text(details)
                            .font(.caption.monospaced())
                            .foregroundStyle(Brand.ink.opacity(0.72))
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.top, 8)
                    }
                    .frame(maxHeight: 180)
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(Brand.ink.opacity(0.7))
            }
        }
        .padding(12)
        .background(Color.red.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

private struct ResultView: View {
    @ObservedObject var state: InviteStudioState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Invite Preview", subtitle: state.elapsedText.isEmpty ? "Your first draft appears here." : "Generated in \(state.elapsedText).")

            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Brand.paper)
                    .overlay {
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(Brand.line, lineWidth: 1)
                    }

                if let image = state.image {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .padding(10)
                } else if state.isGenerating {
                    GeneratingView(prompt: state.promptText)
                } else {
                    EmptyPreview()
                }
            }
            .aspectRatio(5.0 / 7.0, contentMode: .fit)

            if let image = state.image {
                ShareLink(item: Image(uiImage: image), preview: SharePreview("Cordial Invite", image: Image(uiImage: image))) {
                    Label("Share Invite", systemImage: "square.and.arrow.up")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(Brand.sage)
                .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
            }

            if !state.prompt.isEmpty {
                DisclosureGroup("Prompt") {
                    Text(state.prompt)
                        .font(.caption)
                        .foregroundStyle(Brand.ink.opacity(0.7))
                        .padding(.top, 8)
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Brand.ink.opacity(0.7))
            }
        }
        .cardSurface()
    }
}

private struct GeneratingView: View {
    let prompt: String

    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .scaleEffect(1.35)
                .tint(Brand.clay)
            Text("Sketching the first concept...")
                .font(.system(.title3, design: .serif, weight: .semibold))
                .foregroundStyle(Brand.ink)
            Text("This can take a minute. Cordial is turning your note into a polished invitation.")
                .font(.footnote)
                .foregroundStyle(Brand.ink.opacity(0.62))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
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
            Text("Tap Sketch Invite to generate a first draft.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .foregroundStyle(Brand.ink)
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

private struct ChipRow: View {
    let title: String
    let values: [String]
    let selected: String
    let onTap: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Brand.ink.opacity(0.62))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(values, id: \.self) { value in
                        Button(value) {
                            onTap(value)
                        }
                        .buttonStyle(.plain)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(selected == value ? .white : Brand.ink)
                        .padding(.horizontal, 14)
                        .frame(height: 36)
                        .background(selected == value ? Brand.sage : Brand.paper)
                        .clipShape(Capsule())
                        .overlay {
                            Capsule().stroke(Brand.line.opacity(selected == value ? 0 : 1), lineWidth: 1)
                        }
                    }
                }
            }
        }
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
        .frame(height: 48)
        .background(Brand.paper)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Brand.line.opacity(0.75), lineWidth: 1)
        }
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
