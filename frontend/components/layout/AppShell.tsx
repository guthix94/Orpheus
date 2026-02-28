"use client";

import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main
        className={`
          min-h-screen
          md:ml-[var(--spacing-sidebar)]
          px-5
          [padding-top:calc(var(--safe-area-top)_+_1.5rem)]
          [padding-bottom:calc(5rem_+_var(--safe-area-bottom))]
          md:[padding-top:2rem] md:px-8
          md:[padding-bottom:2rem]
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
