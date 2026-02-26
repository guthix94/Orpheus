"use client";

import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

/** Pages that render without the app shell (sidebar/nav). */
const SHELL_EXCLUDED = ["/login"];
const SHELL_EXCLUDED_PREFIXES = ["/parent"];

export default function AppShellWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (SHELL_EXCLUDED.includes(pathname) || SHELL_EXCLUDED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
