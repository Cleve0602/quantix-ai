import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quantix AI — Retail Operations Center",
  description: "Next-gen inventory, sales analytics, and automated procurement platform.",
  icons: {
    icon: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-[#F8FAFC] text-slate-900">
        {children}
      </body>
    </html>
  );
}