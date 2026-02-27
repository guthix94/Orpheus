"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Mic, Users, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/lesson/record", label: "Record", icon: Mic },
  { href: "/students", label: "Students", icon: Users },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-warm-white border-t border-sand z-40 shadow-nav pb-[env(safe-area-inset-bottom)]">
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
                  ${active ? "text-amber" : "text-stone"}
                `}
              >
                <Icon
                  size={22}
                  className={active ? "text-amber" : ""}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button
            onClick={handleSignOut}
            className="flex w-full flex-col items-center justify-center gap-0.5 py-1.5 text-xs font-medium text-stone transition-colors duration-[var(--transition-fast)]"
          >
            <LogOut size={22} />
            <span>Sign Out</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
