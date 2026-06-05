"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/app/utils/supabase/client";
import { Button } from "@/components/ui/Button";
import {
  ALLOWED_EMAIL_DOMAIN,
  getAuthErrorMessage,
  getSafeNextPath,
  isAllowedCollegeEmail,
} from "@/app/utils/auth";

export function MagicLinkForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const serverError = useMemo(
    () => getAuthErrorMessage(searchParams.get("error")),
    [searchParams],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);

    if (!isAllowedCollegeEmail(email)) {
      setErrorMessage(
        `Use your campus email address ending in ${ALLOWED_EMAIL_DOMAIN}.`,
      );
      return;
    }

    setIsSubmitting(true);

    const supabase = createClient();
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", nextPath);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl.toString(),
      },
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage(
      "Magic link dispatched. Check your IITG inbox and use the sign-in link provided.",
    );
    setEmail("");
  };

  return (
    <div className="glass-card relative p-8 lg:p-10 hover-lift border-t-8 border-t-[var(--foreground)]">
      <div className="absolute -left-4 -top-4 font-serif text-8xl text-[var(--foreground)] opacity-5">
        &
      </div>
      <div className="space-y-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
          Authentication
        </p>
        <h2 className="editorial-heading text-3xl sm:text-4xl">
          Magic Link
        </h2>
        <p className="text-sm font-medium leading-relaxed text-[var(--ink-800)] dark:text-gray-300">
          Enter your <span className="font-bold text-[var(--foreground)]">{ALLOWED_EMAIL_DOMAIN}</span> email to receive a passwordless sign-in link.
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2 border-l-2 border-[var(--border-color)] pl-4 focus-within:border-[var(--foreground)] transition-colors">
          <label className="block text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">
            Campus Email
          </label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={`your-name${ALLOWED_EMAIL_DOMAIN}`}
            className="w-full bg-transparent text-lg font-serif font-bold text-[var(--foreground)] placeholder:text-gray-400 outline-none"
            autoComplete="email"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? "Dispatching..." : "Send Magic Link"}
        </Button>
      </form>

      {(serverError || errorMessage) && (
        <div className="mt-6 border-l-4 border-[var(--accent-red)] bg-[var(--accent-red)]/10 p-4 text-sm font-medium text-[var(--accent-red)]">
          {errorMessage ?? serverError}
        </div>
      )}

      {statusMessage && (
        <div className="mt-6 border-l-4 border-emerald-500 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-400">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
