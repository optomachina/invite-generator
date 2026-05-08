import { PaidPoll } from "./PaidPoll";

export const dynamic = "force-dynamic";

type PaidPageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function PaidPage({ searchParams }: PaidPageProps) {
  const { orderId } = await searchParams;

  if (!orderId) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-ink">Missing order</h1>
        <p className="mt-2 text-sm text-ink/70">
          We couldn&apos;t find your order — try the link in your email.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <PaidPoll orderId={orderId} />
    </main>
  );
}
