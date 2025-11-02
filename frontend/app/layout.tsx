import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "./Header";

export const metadata: Metadata = {
  title: "Water Intake Tracker - FHE Encrypted",
  description: "Track your daily water intake with fully homomorphic encryption",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`water-bg text-foreground antialiased`}>
        <div className="fixed inset-0 w-full h-full water-bg z-[-20] min-w-[850px]"></div>
        <Providers>
          <main className="flex flex-col max-w-screen-lg mx-auto pb-20 min-w-[850px]">
            <Header />
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}

