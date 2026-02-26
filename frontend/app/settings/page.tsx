"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { api } from "@/lib/api";
import FadeIn from "@/components/ui/FadeIn";

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await api<Profile>("/api/me");
        if (!cancelled) {
          setProfile(p);
          setDisplayName(p.display_name ?? "");
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const updated = await api<Profile>("/api/me/display-name", {
        method: "PUT",
        body: JSON.stringify({ display_name: displayName }),
      });
      setProfile(updated);
      setDisplayName(updated.display_name ?? "");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = profile !== null && displayName !== (profile.display_name ?? "");

  return (
    <div className="space-y-8">
      <FadeIn>
        <h1 className="font-serif text-[2rem] leading-tight font-semibold text-charcoal">
          Settings
        </h1>
      </FadeIn>

      <FadeIn delay={50}>
        <div className="max-w-lg rounded-[var(--radius-card)] bg-warm-white p-6 shadow-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-glow">
              <User size={20} className="text-amber" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal">Profile</h2>
              <p className="text-sm text-stone">
                This name appears on the parent portal.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 w-24 rounded bg-sand" />
              <div className="h-10 w-full rounded bg-sand" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label
                  htmlFor="display-name"
                  className="block text-sm font-medium text-charcoal"
                >
                  Display name
                </label>
                <input
                  id="display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ms. Sarah Chen"
                  className="mt-1 w-full rounded-[var(--radius-button)] border border-sand bg-warm-white px-3.5 py-2.5 text-sm text-charcoal placeholder:text-mist focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>

              {profile?.email && (
                <div>
                  <label className="block text-sm font-medium text-charcoal">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-stone">{profile.email}</p>
                </div>
              )}

              {error && (
                <div className="rounded-[var(--radius-button)] bg-error-bg px-4 py-3 text-sm text-error">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || !isDirty || !displayName.trim()}
                  className="rounded-[var(--radius-button)] bg-charcoal px-4 py-2.5 text-sm font-semibold text-white transition-shadow hover:shadow-card-hover disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                {saved && (
                  <span className="text-sm font-medium text-emerald-600">
                    Saved
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
