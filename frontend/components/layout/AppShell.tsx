"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-ivory-100">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main
        className={`
          min-h-screen
          md:ml-[var(--spacing-sidebar)]
          pt-6 px-5 pb-24
          md:pt-8 md:px-8 md:pb-8
        `}
      >
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
