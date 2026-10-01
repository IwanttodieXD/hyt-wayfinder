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
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
