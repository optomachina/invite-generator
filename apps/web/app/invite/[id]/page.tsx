import { InviteEditor } from "./InviteEditor";

export const dynamic = "force-dynamic";

type InvitePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!id || !token) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="font-serif text-3xl text-ink">Missing access link</h1>
        <p className="mt-2 text-sm text-ink/70">
          This page needs the full link from your email. If you lost it, you can{" "}
          <a className="underline" href="/recover">
            email yourself a new one
          </a>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <InviteEditor orderId={id} token={token} />
    </main>
  );
}
