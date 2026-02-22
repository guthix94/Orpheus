"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      // Auto sign-in after signup (Supabase default if email confirmation disabled)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        // Likely needs email confirmation
        setError(
          "Account created. Check your email to confirm, then sign in.",
        );
        setIsSignUp(false);
        setLoading(false);
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold text-charcoal tracking-tight">
            Orpheus
          </h1>
          <p className="mt-2 text-sm text-stone">
            Intelligent lesson documentation for music educators
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-charcoal"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-button)] border border-sand bg-warm-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-mist focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-charcoal"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="mt-1 w-full rounded-[var(--radius-button)] border border-sand bg-warm-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-mist focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              placeholder={isSignUp ? "At least 6 characters" : ""}
            />
          </div>

          {error && (
            <div className="rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-button)] bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-60"
          >
            {loading
              ? isSignUp
                ? "Creating account..."
                : "Signing in..."
              : isSignUp
                ? "Create Account"
                : "Sign In"}
          </button>
        </form>

        {/* Toggle */}
        <p className="mt-6 text-center text-sm text-stone">
          {isSignUp ? "Already have an account?" : "New to Orpheus?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="font-medium text-amber underline"
          >
            {isSignUp ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>
  );
}
