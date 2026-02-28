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
          px-5 pb-24
          [padding-top:calc(env(safe-area-inset-top)_+_1.5rem)]
          md:[padding-top:2rem] md:px-8 md:pb-8
          [padding-bottom:calc(6rem+env(safe-area-inset-bottom))]
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
