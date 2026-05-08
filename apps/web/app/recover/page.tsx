import { RecoverForm } from "./RecoverForm";

export const dynamic = "force-dynamic";

export default function RecoverPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="font-serif text-3xl text-ink">Find your invites</h1>
      <p className="mt-2 text-sm text-ink/70">
        Enter the email you used at checkout. We&apos;ll send you links to every
        invite you&apos;ve created with us.
      </p>
      <div className="mt-6">
        <RecoverForm />
      </div>
    </main>
  );
}
