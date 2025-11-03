"use client";

import { useAccount, useWalletClient } from "wagmi";
import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { createFhevmInstance } from "@/fhevm/internal/fhevm";

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export function useFhevmWithWagmi(parameters: {
  chainId: number | undefined;
  enabled?: boolean;
}): {
  instance: FhevmInstance | undefined;
  refresh: () => void;
  error: Error | undefined;
  status: FhevmGoState;
} {
  const { chainId, enabled = true } = parameters;
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const [instance, setInstance] = useState<FhevmInstance | undefined>(undefined);
  const [status, setStatus] = useState<FhevmGoState>("idle");
  const [error, setError] = useState<Error | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createInstance = useCallback(async () => {
    if (!enabled || !chainId || !walletClient) {
      setInstance(undefined);
      setStatus("idle");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setStatus("loading");
    setError(undefined);

    try {
      // For localhost/hardhat, use RPC URL directly
      // For other networks, use walletClient as Eip1193Provider
      let provider: ethers.Eip1193Provider | string;
      
      if (chainId === 31337) {
        // Use RPC URL for localhost to avoid provider issues
        provider = "http://localhost:8545";
      } else {
        // Use walletClient directly as Eip1193Provider
        provider = walletClient as ethers.Eip1193Provider;
      }
      
      // Create FHEVM instance using the helper function
      const fhevmInstance = await createFhevmInstance({
        provider,
        mockChains: { 31337: "http://localhost:8545" },
        signal,
      });

      if (signal.aborted) return;

      setInstance(fhevmInstance);
      setError(undefined);
      setStatus("ready");
    } catch (e) {
      if (signal.aborted) return;
      setInstance(undefined);
      setError(e as Error);
      setStatus("error");
    }
  }, [enabled, chainId, walletClient]);

  const refresh = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setInstance(undefined);
    setError(undefined);
    setStatus("idle");
    createInstance();
  }, [createInstance]);

  useEffect(() => {
    createInstance();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [createInstance]);

  return { instance, refresh, error, status };
}

