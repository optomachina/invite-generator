"use client";

import { useEffect, useRef, useState } from "react";
import { useVoiceEnabled } from "@/app/hooks/useVoiceEnabled";

export type EventChipId =
  | "birthday"
  | "baby_shower"
  | "graduation"
  | "gender_reveal"
  | "milestone"
  | "wedding"
  | "other";

type Chip = { id: EventChipId; label: string; seed: string };

const CHIPS: Chip[] = [
  { id: "birthday", label: "Birthday", seed: "A birthday party for " },
  { id: "baby_shower", label: "Baby shower", seed: "A baby shower for " },
  { id: "graduation", label: "Graduation", seed: "A graduation party for " },
  { id: "gender_reveal", label: "Gender reveal", seed: "A gender reveal for " },
  { id: "milestone", label: "Milestone", seed: "A milestone celebration for " },
  { id: "wedding", label: "Wedding", seed: "A wedding for " },
  { id: "other", label: "Other", seed: "" },
];

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function IntakeHybrid({ value, onChange }: Props) {
  const { enabled: voiceEnabled, loaded: voiceLoaded } = useVoiceEnabled();
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      stopAndCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAndCleanup() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // already stopped
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  async function startRecording() {
    if (recording || transcribing) return;
    setRecordError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordError("Microphone not supported on this browser.");
      return;
    }
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
      setRecordError("Recording not supported on this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (tickRef.current !== null) {
          window.clearInterval(tickRef.current);
          tickRef.current = null;
        }
        setRecording(false);
        void transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 100);
      setRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not access microphone.";
      setRecordError(msg);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      recorder.stop();
    } catch {
      // ignore
    }
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "intake.webm");
      const res = await fetch("/api/v1/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        if (res.status === 503) {
          setRecordError("Voice input is temporarily off. Please type instead.");
        } else if (res.status === 501) {
          setRecordError("Voice transcription isn't available yet.");
        } else {
          setRecordError(`Transcription failed (${res.status}).`);
        }
        return;
      }
      const data = (await res.json()) as { text?: string };
      const text = (data.text ?? "").trim();
      if (!text) return;
      const next = value.length === 0 || value.endsWith(" ") ? `${value}${text}` : `${value} ${text}`;
      onChange(next);
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : "Transcription failed.");
    } finally {
      setTranscribing(false);
    }
  }

  function applyChip(chip: Chip) {
    const seed = chip.seed;
    if (!seed) {
      textareaRef.current?.focus();
      return;
    }
    if (value.trim().length === 0) {
      onChange(seed);
    } else {
      const sep = value.endsWith(" ") ? "" : " ";
      onChange(`${value}${sep}${seed}`);
    }
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  const showMic = voiceLoaded && voiceEnabled;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(1, "0")}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Event type suggestions">
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => applyChip(chip)}
            className="rounded-full border border-ink/20 bg-white px-3 py-1 text-xs text-ink/80 transition-colors hover:border-ochre hover:text-ink"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder="Tell us about the event — who it's for, when, where, the vibe."
          className="w-full resize-none rounded-lg border border-ink/20 bg-white px-3 py-2.5 pr-14 text-sm text-ink placeholder:text-ink/40 focus:border-ochre focus:outline-none"
        />

        {showMic && (
          <button
            type="button"
            aria-label={recording ? "Recording — release to stop" : "Hold to record"}
            aria-pressed={recording}
            onPointerDown={(e) => {
              e.preventDefault();
              void startRecording();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              stopRecording();
            }}
            onPointerLeave={() => {
              if (recording) stopRecording();
            }}
            onPointerCancel={() => {
              if (recording) stopRecording();
            }}
            disabled={transcribing}
            className={`absolute bottom-2 right-2 flex h-10 w-10 select-none items-center justify-center rounded-full border transition-colors ${
              recording
                ? "border-red-500 bg-red-500 text-white"
                : transcribing
                  ? "border-ink/20 bg-ink/5 text-ink/40"
                  : "border-ink/20 bg-white text-ink/70 hover:border-ochre hover:text-ink"
            }`}
          >
            <MicIcon recording={recording} />
          </button>
        )}
      </div>

      <div className="mt-2 flex min-h-[1rem] items-center justify-between text-xs">
        <span className="text-ink/55">
          {recording
            ? `Recording… release to stop · ${elapsedLabel}`
            : transcribing
              ? "Transcribing…"
              : showMic
                ? "Hold the mic to dictate. Release to stop."
                : voiceLoaded
                  ? "Type your event details above."
                  : ""}
        </span>
        {recordError && <span className="text-red-700">{recordError}</span>}
      </div>
    </div>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  if (recording) {
    return (
      <span className="block h-3 w-3 rounded-sm bg-white" aria-hidden />
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
