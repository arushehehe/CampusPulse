"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialValue: boolean;
};

export function PrivacyToggle({ initialValue }: Props) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updatePrivacy = async () => {
    const nextValue = !isPublic;
    setErrorMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/profile/privacy", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isAttendancePublic: nextValue,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update privacy.");
      return;
    }

    setIsPublic(nextValue);
    router.refresh();
  };

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        onClick={updatePrivacy}
        disabled={isSubmitting}
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Saving..."
          : isPublic
            ? "Hide my attendee profile"
            : "Show my attendee profile"}
      </button>
      {errorMessage && <p className="text-xs text-rose-700">{errorMessage}</p>}
    </div>
  );
}
