"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat } from "wagmi/chains";
import { InMemoryStorageProvider } from "@/hooks/useInMemoryStorage";
import "@rainbow-me/rainbowkit/styles.css";

// Suppress known harmless errors/warnings that are expected with COEP policy
// These errors occur because COEP 'require-corp' blocks third-party resources without proper CORS headers
// They don't affect FHEVM functionality
if (typeof window !== "undefined") {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Suppress specific harmless errors
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || "";
    const fullMessage = args.join(" ");
    
    // Suppress Base Account SDK COOP warning
    if (message.includes("Base Account SDK requires the Cross-Origin-Opener-Policy")) {
      return;
    }
    
    // Suppress Coinbase analytics errors (blocked by COEP, expected and harmless)
    if (fullMessage.includes("cca-lite.coinbase.com") || 
        fullMessage.includes("ERR_BLOCKED_BY_RESPONSE") ||
        fullMessage.includes("Analytics SDK") && fullMessage.includes("Failed to fetch")) {
      return;
    }
    
    originalError.apply(console, args);
  };
  
  // Suppress Lit dev mode warning (harmless, just noise)
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || "";
    if (message.includes("Lit is in dev mode")) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

const config = getDefaultConfig({
  appName: "Water Intake Tracker",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [sepolia, hardhat],
  ssr: false,
});

const queryClient = new QueryClient();

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <InMemoryStorageProvider>{children}</InMemoryStorageProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

