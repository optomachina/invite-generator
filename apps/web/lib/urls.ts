export function appOrigin(): string {
  const raw = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new Error("APP_URL not set");
  return raw.replace(/\/+$/, "");
}

export function manageUrlFor(orderId: string, accessToken: string): string {
  const url = new URL(`/invite/${orderId}`, `${appOrigin()}/`);
  url.searchParams.set("token", accessToken);
  return url.toString();
}
