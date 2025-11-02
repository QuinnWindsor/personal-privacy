"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { useFhevmWithWagmi } from "@/hooks/useFhevmWithWagmi";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useWaterIntake } from "@/hooks/useWaterIntake";

export const WaterIntakeDemo = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const [intakeValue, setIntakeValue] = useState<string>("");
  const [mounted, setMounted] = useState(false);

  // 防止 hydration 错误
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevmWithWagmi({
    chainId,
    enabled: isConnected,
  });

  const waterIntake = useWaterIntake({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    chainId,
  });

  const handleAddIntake = async () => {
    const value = parseInt(intakeValue);
    if (isNaN(value) || value <= 0) {
      alert("Please enter a valid positive number");
      return;
    }
    try {
      await waterIntake.addIntake(value);
      setIntakeValue("");
    } catch (error) {
      // Error is already handled in useWaterIntake hook
      // Just log for debugging
      console.error("Error in handleAddIntake:", error);
    }
  };

  // 在客户端挂载前显示加载状态，避免 hydration 错误
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h2 className="text-3xl font-bold text-gray-800">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to start tracking your water intake</p>
        <ConnectButton />
      </div>
    );
  }

  if (waterIntake.isDeployed === false) {
    return (
      <div className="mx-auto p-8 bg-red-50 border-2 border-red-500 rounded-lg">
        <p className="text-xl font-semibold text-red-700">
          WaterIntake contract not deployed on chainId={chainId}
        </p>
        <p className="mt-4 text-gray-700">
          Please deploy the contract first by running:{" "}
          <code className="bg-gray-200 px-2 py-1 rounded">
            npx hardhat deploy --network {chainId === 11155111 ? "sepolia" : "localhost"}
          </code>
        </p>
      </div>
    );
  }

  // Show warning if FHEVM has errors (especially relayer errors on Sepolia)
  if (fhevmStatus === "error" && fhevmError) {
    const isRelayerError = fhevmError.message?.includes("Relayer") || 
                          fhevmError.message?.includes("backend connection");
    
    if (isRelayerError && chainId === 11155111) {
      return (
        <div className="mx-auto p-8 bg-yellow-50 border-2 border-yellow-500 rounded-lg">
          <p className="text-xl font-semibold text-yellow-700 mb-4">
            ⚠️ FHEVM Relayer Service Unavailable
          </p>
          <p className="text-gray-700 mb-4">
            The FHEVM relayer service for Sepolia testnet is currently unavailable. 
            This may be a temporary issue.
          </p>
          <div className="bg-white p-4 rounded border border-yellow-300">
            <p className="font-semibold mb-2">Options:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Wait a few minutes and try again</li>
              <li>Switch to Hardhat local network (Chain ID 31337) for testing</li>
              <li>Check the FHEVM relayer status</li>
            </ol>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Error: {fhevmError.message}
          </p>
        </div>
      );
    }
  }

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  return (
    <div className="grid w-full gap-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="col-span-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-2">💧 Water Intake Tracker</h1>
        <p className="text-lg opacity-90">Track your daily water intake with fully homomorphic encryption</p>
      </div>

      {/* Add Intake Form */}
      <div className="col-span-full bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Add Daily Intake</h2>
        <div className="flex gap-4">
          <input
            type="number"
            value={intakeValue}
            onChange={(e) => setIntakeValue(e.target.value)}
            placeholder="Enter amount in ml (e.g., 500, 1000)"
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg transition-all"
            disabled={!waterIntake.canAddIntake}
            min="1"
            max="10000"
          />
          <button
            className={buttonClass}
            disabled={!waterIntake.canAddIntake}
            onClick={handleAddIntake}
          >
            {waterIntake.isAdding ? "Adding..." : "Add Intake"}
          </button>
        </div>
        {waterIntake.message && (
          <p className="mt-4 text-sm text-gray-600">{waterIntake.message}</p>
        )}
        <div className="mt-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setIntakeValue("250")}
            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            disabled={!waterIntake.canAddIntake}
          >
            250ml
          </button>
          <button
            onClick={() => setIntakeValue("500")}
            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            disabled={!waterIntake.canAddIntake}
          >
            500ml
          </button>
          <button
            onClick={() => setIntakeValue("750")}
            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            disabled={!waterIntake.canAddIntake}
          >
            750ml
          </button>
          <button
            onClick={() => setIntakeValue("1000")}
            className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            disabled={!waterIntake.canAddIntake}
          >
            1000ml
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Intake</h3>
          {waterIntake.isDecrypted ? (
            <p className="text-3xl font-bold text-blue-600">{Number(waterIntake.total || 0)} ml</p>
          ) : (
            <p className="text-sm text-gray-500">Encrypted</p>
          )}
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Days Tracked</h3>
          {waterIntake.isDecrypted ? (
            <p className="text-3xl font-bold text-green-600">{Number(waterIntake.dayCount || 0)}</p>
          ) : (
            <p className="text-sm text-gray-500">Encrypted</p>
          )}
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Average</h3>
          {waterIntake.isDecrypted && waterIntake.average !== undefined ? (
            <p className="text-3xl font-bold text-purple-600">{waterIntake.average} ml/day</p>
          ) : (
            <p className="text-sm text-gray-500">Decrypt to view</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-full grid grid-cols-2 gap-4">
        <button
          className={buttonClass}
          disabled={!waterIntake.canDecrypt}
          onClick={waterIntake.decryptData}
        >
          {waterIntake.isDecrypting
            ? "Decrypting..."
            : waterIntake.isDecrypted
              ? "Decrypt Again"
              : "Decrypt Statistics"}
        </button>
        <button
          className={buttonClass + " bg-gray-600 hover:bg-gray-700"}
          disabled={!waterIntake.canGetData}
          onClick={waterIntake.refreshData}
        >
          {waterIntake.isRefreshing ? "Refreshing..." : "Refresh Data"}
        </button>
      </div>

      {/* Network Warning for Sepolia */}
      {chainId === 11155111 && (
        <div className="col-span-full bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <p className="font-semibold text-blue-800 mb-2">ℹ️ Sepolia Testnet</p>
          <p className="text-sm text-blue-700">
            You are connected to Sepolia testnet. If you encounter relayer errors, 
            try switching to Hardhat local network (Chain ID 31337) for local testing.
          </p>
        </div>
      )}

      {/* Debug Info */}
      <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
        <p className="font-semibold mb-2">Debug Info:</p>
        <p>FHEVM Status: <span className="font-mono">{fhevmStatus}</span></p>
        {fhevmError && (
          <p className="text-red-600">
            FHEVM Error: {fhevmError.message}
            {fhevmError.message?.includes("Relayer") && (
              <span className="block mt-1 text-xs">
                (Relayer service may be temporarily unavailable)
              </span>
            )}
          </p>
        )}
        <p>Contract: <span className="font-mono">{waterIntake.contractAddress || "Not deployed"}</span></p>
        <p>Chain ID: <span className="font-mono">{chainId}</span></p>
        <p>Address: <span className="font-mono">{address}</span></p>
      </div>
    </div>
  );
};

/ /   U I   e n h a n c e m e n t s  
 