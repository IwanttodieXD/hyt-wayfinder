import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HYT WAYFINDER",
  description: "Virtual 3D tour of HYT Global Institute building",
  icons: {
    icon: "/hyt_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
