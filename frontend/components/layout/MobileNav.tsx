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
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/lesson/record", label: "Record", icon: Mic },
  { href: "/students", label: "Students", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-ivory-300 z-40 shadow-nav">
      <ul className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 py-1.5
                  text-xs font-medium transition-colors duration-[var(--transition-fast)]
                  ${active ? "text-amber-600" : "text-slate-400"}
                `}
              >
                <Icon
                  size={22}
                  className={active ? "text-amber-500" : ""}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
