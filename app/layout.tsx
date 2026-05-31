import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DUO Friends",
  description: "Made by Hridoy for friends",
  icons: {
    icon: "/uno.svg", // ⭐️ ফেভিকন হিসেবে আপনার uno.svg কাজ করবে
    apple: "/uno.svg", // ⭐️ ফোনে ইনস্টল করলে এই আইকনটি দেখাবে
  },
  themeColor: "#E52521",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}