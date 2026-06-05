import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://angli.site"),
  title: {
    default: "Ang Li | Teaching, AI, and Community",
    template: "%s | Ang Li",
  },
  description:
    "The personal site of Dr. Ang Li: teacher of church history, practical AI builder, and thoughtful participant in community-centered real estate conversations.",
  openGraph: {
    title: "Ang Li | Teaching, AI, and Community",
    description:
      "Teaching church history, building practical AI tools, and exploring community-centered spaces.",
    url: "https://angli.site",
    siteName: "Ang Li",
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-paper text-ink antialiased">
        <Nav />
        <main className="mx-auto min-h-screen w-full px-5 pb-20 pt-32 sm:px-6 lg:px-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
