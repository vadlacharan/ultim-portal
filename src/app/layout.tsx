import type { Metadata } from "next";
import { Barlow_Condensed, Manrope, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/portal/auth-provider";
import { ThemeProvider } from "@/components/portal/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const displayFont = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ULTIM Partner Portal",
    template: "%s · ULTIM Partner",
  },
  description:
    "Manage your facility, membership plans, members, bookings and payments on ULTIM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${displayFont.variable} ${bodyFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
