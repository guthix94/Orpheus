"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, Users, Settings } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/lesson/record", label: "Record", icon: Mic },
  { href: "/students", label: "Students", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[var(--spacing-sidebar)] flex-col bg-charcoal text-white z-40">
      {/* Logo */}
      <div className="px-6 py-6">
        <Link href="/dashboard" className="block">
          <h1 className="font-serif text-xl font-bold text-white tracking-tight">
            Orpheus
          </h1>
          <p className="text-xs text-stone mt-0.5">Orpheus</p>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-button)] text-sm font-medium
                    transition-colors duration-[var(--transition-fast)]
                    ${
                      active
                        ? "bg-amber-glow text-amber-light"
                        : "text-stone hover:text-white hover:bg-graphite"
                    }
                  `}
                >
                  <Icon size={20} className={active ? "text-amber-light" : ""} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-graphite">
        <p className="text-xs text-stone">v0.1.0 MVP</p>
      </div>
    </aside>
  );
}
