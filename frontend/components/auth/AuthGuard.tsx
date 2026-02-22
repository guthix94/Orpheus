"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (!s && !PUBLIC_PATHS.includes(pathname)) {
        router.replace("/login");
      }
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s && !PUBLIC_PATHS.includes(pathname)) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router]);

  // Still loading auth state
  if (session === undefined && !PUBLIC_PATHS.includes(pathname)) {
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
