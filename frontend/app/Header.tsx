"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <nav className="flex w-full px-3 md:px-0 h-fit py-10 justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-3xl">
          💧
        </div>
        <h1 className="text-2xl font-bold text-white">Water Intake Tracker</h1>
      </div>
      <div className="flex items-center">
        <ConnectButton />
      </div>
    </nav>
  );
}

