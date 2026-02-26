"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = ["/parent"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      const isPublic = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
      if (!s && !isPublic) {
        router.replace("/login");
      }
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      const isPublic = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
      if (!s && !isPublic) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  // Still loading auth state
  const isPublicPath = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (session === undefined && !isPublicPath) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <h1 className="font-serif text-2xl font-semibold text-charcoal">
            Orpheus
          </h1>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
            <span className="h-2 w-2 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="h-2 w-2 rounded-full bg-amber animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
