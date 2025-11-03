"use client";

import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { WaterIntakeAddresses } from "@/abi/WaterIntakeAddresses";
import { WaterIntakeABI } from "@/abi/WaterIntakeABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type WaterIntakeInfoType = {
  abi: typeof WaterIntakeABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getWaterIntakeByChainId(chainId: number | undefined): WaterIntakeInfoType {
  if (!chainId) {
    return { abi: WaterIntakeABI.abi };
  }

  const entry = WaterIntakeAddresses[chainId.toString() as keyof typeof WaterIntakeAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: WaterIntakeABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: WaterIntakeABI.abi,
  };
}

export const useWaterIntake = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
}) => {
  const { instance, fhevmDecryptionSignatureStorage, chainId } = parameters;
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [totalHandle, setTotalHandle] = useState<string | undefined>(undefined);
  const [dayCountHandle, setDayCountHandle] = useState<string | undefined>(undefined);
  const [clearTotal, setClearTotal] = useState<ClearValueType | undefined>(undefined);
  const [clearDayCount, setClearDayCount] = useState<ClearValueType | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const waterIntake = useMemo(() => {
    const c = getWaterIntakeByChainId(chainId);
    if (!c.address) {
      setMessage(`WaterIntake deployment not found for chainId=${chainId}.`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!waterIntake) {
      return undefined;
    }
    return Boolean(waterIntake.address) && waterIntake.address !== ethers.ZeroAddress;
  }, [waterIntake]);

  const canGetData = useMemo(() => {
    return waterIntake.address && publicClient && !isRefreshing;
  }, [waterIntake.address, publicClient, isRefreshing]);

  const refreshData = useCallback(async () => {
    if (isRefreshing || !waterIntake.address || !publicClient) {
      return;
    }

    setIsRefreshing(true);
    setMessage("Refreshing data...");

    try {
      const total = await publicClient.readContract({
        address: waterIntake.address as `0x${string}`,
        abi: waterIntake.abi,
        functionName: "getTotalIntake",
      });

      const dayCount = await publicClient.readContract({
        address: waterIntake.address as `0x${string}`,
        abi: waterIntake.abi,
        functionName: "getDayCount",
      });

      setTotalHandle(total as string);
      setDayCountHandle(dayCount as string);
      setMessage("Data refreshed");
    } catch (e) {
      setMessage(`Error refreshing data: ${e}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [waterIntake, publicClient, isRefreshing]);

  // 移除自动刷新，只在用户手动点击刷新按钮时刷新
  // 这样可以避免无限轮询导致 Hardhat 节点日志不断滚动
  // useEffect(() => {
  //   if (waterIntake.address && publicClient && !isRefreshing) {
  //     refreshData();
  //   }
  // }, [waterIntake.address, publicClient]);

  const canDecrypt = useMemo(() => {
    return (
      waterIntake.address &&
      instance &&
      address &&
      walletClient &&
      !isRefreshing &&
      !isDecrypting &&
      totalHandle &&
      totalHandle !== ethers.ZeroHash
    );
  }, [waterIntake.address, instance, address, walletClient, isRefreshing, isDecrypting, totalHandle]);

  const decryptData = useCallback(async () => {
    if (isDecrypting || !instance || !address || !walletClient || !waterIntake.address || !totalHandle) {
      return;
    }

    setIsDecrypting(true);
    setMessage("Decrypting data...");

    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();

      const sig = await FhevmDecryptionSignature.loadOrSign(
        instance,
        [waterIntake.address],
        signer,
        fhevmDecryptionSignatureStorage
      );

      if (!sig) {
        setMessage("Unable to build FHEVM decryption signature");
        return;
      }

      const totalResult = await instance.userDecrypt(
        [{ handle: totalHandle, contractAddress: waterIntake.address }],
        sig.privateKey,
        sig.publicKey,
        sig.signature,
        sig.contractAddresses,
        sig.userAddress,
        sig.startTimestamp,
        sig.durationDays
      );

      setClearTotal({ handle: totalHandle, clear: totalResult[totalHandle] });

      if (dayCountHandle && dayCountHandle !== ethers.ZeroHash) {
        const dayCountResult = await instance.userDecrypt(
          [{ handle: dayCountHandle, contractAddress: waterIntake.address }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        setClearDayCount({ handle: dayCountHandle, clear: dayCountResult[dayCountHandle] });
      }

      setMessage("Decryption completed!");
    } catch (e) {
      setMessage(`Decryption failed: ${e}`);
    } finally {
      setIsDecrypting(false);
    }
  }, [instance, address, walletClient, waterIntake.address, totalHandle, dayCountHandle, fhevmDecryptionSignatureStorage]);

  const canAddIntake = useMemo(() => {
    return waterIntake.address && instance && address && walletClient && !isRefreshing && !isAdding;
  }, [waterIntake.address, instance, address, walletClient, isRefreshing, isAdding]);

  const addIntake = useCallback(async (intake: number) => {
    if (isAdding || !instance || !address || !walletClient || !waterIntake.address || intake <= 0) {
      return;
    }

    // Validate intake value range
    if (intake > 10000) {
      setMessage("Intake value cannot exceed 10000ml per day");
      return;
    }

    setIsAdding(true);
    setMessage(`Adding ${intake}ml...`);

    try {
      const provider = new ethers.BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(waterIntake.address, waterIntake.abi, signer);

      const input = instance.createEncryptedInput(waterIntake.address, address);
      input.add32(intake);
      
      // Try to encrypt with retry mechanism for relayer errors
      let enc;
      let retries = 2;
      let lastError;
      
      while (retries >= 0) {
        try {
          enc = await input.encrypt();
          break; // Success, exit retry loop
        } catch (encryptError: any) {
          lastError = encryptError;
          // Check if it's a relayer error that might be temporary
          const isRelayerError = encryptError?.message?.includes("Relayer") || 
                                encryptError?.message?.includes("backend connection") ||
                                encryptError?.message?.includes("Bad status") ||
                                encryptError?.message?.includes("Failed to check contract code");
          
          if (isRelayerError && retries > 0) {
            // Wait before retry (exponential backoff)
            const delay = (3 - retries) * 1000; // 1s, 2s
            setMessage(`Relayer error, retrying in ${delay/1000}s... (${3 - retries}/2)`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retries--;
            continue;
          }
          
          if (isRelayerError) {
            setMessage(
              "FHEVM Relayer service is unavailable after retries. " +
              "This may be a temporary issue. Please wait a few minutes and try again. " +
              "If the problem persists, try switching to Hardhat local network (Chain ID 31337)."
            );
            console.error("Relayer error after retries:", encryptError);
            return;
          }
          
          throw encryptError; // Not a relayer error, throw immediately
        }
      }
      
      if (!enc) {
        setMessage(`Failed to encrypt after retries: ${lastError?.message || 'Unknown error'}`);
        return;
      }

      const tx = await contract.addDailyIntake(enc.handles[0], enc.inputProof);
      setMessage(`Transaction sent: ${tx.hash}...`);

      await tx.wait();
      setMessage("Intake added successfully!");

      // Refresh data
      await refreshData();
    } catch (e: any) {
      // Handle user rejection gracefully
      if (e?.code === "ACTION_REJECTED" || e?.code === 4001 || e?.message?.includes("User rejected")) {
        setMessage("Transaction was cancelled. Please try again if you want to add water intake.");
      } else if (e?.message?.includes("Relayer") || e?.message?.includes("backend connection")) {
        setMessage(
          "FHEVM Relayer service error. " +
          "Please try again in a few moments or switch to Hardhat local network."
        );
      } else {
        setMessage(`Failed to add intake: ${e?.message || e}`);
      }
      console.error("Error adding intake:", e);
    } finally {
      setIsAdding(false);
    }
  }, [instance, address, walletClient, waterIntake, refreshData, isAdding]);

  const average = useMemo(() => {
    if (clearTotal?.clear && clearDayCount?.clear) {
      const total = Number(clearTotal.clear);
      const days = Number(clearDayCount.clear);
      return days > 0 ? Math.round(total / days) : 0;
    }
    return undefined;
  }, [clearTotal, clearDayCount]);

  return {
    contractAddress: waterIntake.address,
    canDecrypt,
    canGetData,
    canAddIntake,
    addIntake,
    decryptData,
    refreshData,
    isDecrypted: Boolean(clearTotal),
    message,
    total: clearTotal?.clear,
    dayCount: clearDayCount?.clear,
    average,
    isDecrypting,
    isRefreshing,
    isAdding,
    isDeployed,
  };
};

