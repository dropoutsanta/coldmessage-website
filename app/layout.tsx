import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "coldmessage.io | Test cold email campaigns, immediately",
  description: "Use thousands of pre-warmed mailboxes to start sending emails the SAME DAY. The fastest way to validate your cold email offer.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "coldmessage.io | Test cold email campaigns, immediately",
    description: "Use thousands of pre-warmed mailboxes to start sending emails the SAME DAY. The fastest way to validate your cold email offer.",
    images: [
      {
        url: "/favicon.png",
        width: 768,
        height: 768,
        alt: "ColdMessage - Frozen envelope logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "coldmessage.io | Test cold email campaigns, immediately",
    description: "Use thousands of pre-warmed mailboxes to start sending emails the SAME DAY. The fastest way to validate your cold email offer.",
    images: ["/favicon.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
