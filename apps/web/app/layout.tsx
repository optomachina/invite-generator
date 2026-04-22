import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invite — preview",
  description: "Editorial AI invites in 2 minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
