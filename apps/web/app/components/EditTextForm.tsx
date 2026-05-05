"use client";

export type ComparePayFields = {
  honoree: string;
  event: string;
  date: string;
  time: string;
  location: string;
  customLine: string;
};

type EditTextFormProps = {
  fields: ComparePayFields;
  onChange: (next: ComparePayFields) => void;
};

type FieldKey = keyof ComparePayFields;

type FieldRowProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  spanFull?: boolean;
  onChange: (value: string) => void;
};

function FieldRow({
  id,
  label,
  value,
  placeholder,
  spanFull,
  onChange,
}: Readonly<FieldRowProps>) {
  const wrapperClass = spanFull
    ? "flex flex-col gap-1.5 sm:col-span-2"
    : "flex flex-col gap-1.5";
  return (
    <div className={wrapperClass}>
      <label
        htmlFor={id}
        className="font-medium text-xs uppercase tracking-[0.18em] text-ink/65"
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm focus:border-ink/40 focus:outline-none"
      />
    </div>
  );
}

export function EditTextForm({ fields, onChange }: Readonly<EditTextFormProps>) {
  const update = (key: FieldKey, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FieldRow
        id="cp-honoree"
        label="Honoree"
        value={fields.honoree}
        onChange={(v) => update("honoree", v)}
      />
      <FieldRow
        id="cp-event"
        label="Event"
        value={fields.event}
        onChange={(v) => update("event", v)}
      />
      <FieldRow
        id="cp-date"
        label="Date"
        value={fields.date}
        onChange={(v) => update("date", v)}
      />
      <FieldRow
        id="cp-time"
        label="Time"
        value={fields.time}
        onChange={(v) => update("time", v)}
      />
      <FieldRow
        id="cp-location"
        label="Location"
        value={fields.location}
        onChange={(v) => update("location", v)}
      />
      <FieldRow
        id="cp-custom-line"
        label="Custom line (optional)"
        value={fields.customLine}
        placeholder="e.g. Bring your favorite stuffed animal!"
        spanFull
        onChange={(v) => update("customLine", v)}
      />
    </div>
  );
}
