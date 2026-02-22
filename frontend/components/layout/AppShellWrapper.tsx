"use client";

import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

/** Pages that render without the app shell (sidebar/nav). */
const SHELL_EXCLUDED = ["/login"];

export default function AppShellWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (SHELL_EXCLUDED.includes(pathname)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
