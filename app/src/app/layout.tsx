import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "1section",
  description: "A thinking library of mental models, audio lessons, and knowledge graphs.",
  icons: {
    icon: "/1section_logo.svg",
    apple: "/1section_logo.svg",
    shortcut: "/1section_logo.svg",
  },
};

import MainLayout from "@/components/MainLayout";
import { LemonScript } from "@/components/LemonScript";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/1section_logo.svg" type="image/svg+xml" />
      </head>
      <body>
        <LemonScript />
        <Providers>
          <AuthProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
