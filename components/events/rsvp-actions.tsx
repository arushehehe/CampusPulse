"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RSVP_STATUSES, getRsvpLabel, type RsvpStatus } from "@/app/utils/events";

type Props = {
  eventId: string;
  initialStatus: RsvpStatus | null;
  counts: Record<RsvpStatus, number>;
};

export function RsvpActions({ eventId, initialStatus, counts }: Props) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<RsvpStatus | null>(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<RsvpStatus | null>(null);

  const handleRsvp = async (status: RsvpStatus) => {
    setErrorMessage(null);
    setIsSubmitting(status);

    const response = await fetch("/api/rsvps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        status,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setIsSubmitting(null);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update RSVP.");
      return;
    }

    setCurrentStatus(status);
    router.refresh();
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap gap-3">
        {RSVP_STATUSES.map((status) => {
          const isActive = currentStatus === status;
          const isBusy = isSubmitting === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() => handleRsvp(status)}
              disabled={Boolean(isSubmitting)}
              className={
                isActive
                  ? "bg-[var(--foreground)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--background)] transition-transform hover:-translate-y-1"
                  : "border-2 border-[var(--foreground)] bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              {isBusy ? "Saving..." : getRsvpLabel(status)}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 pt-4 border-t-2 border-[var(--border-color)]">
        {RSVP_STATUSES.map((status) => (
          <div key={status} className="flex flex-col border-l-2 border-[var(--border-color)] pl-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
              {getRsvpLabel(status)}
            </span>
            <span className="text-xl font-serif font-bold text-[var(--foreground)]">
              {counts[status]}
            </span>
          </div>
        ))}
      </div>

      {errorMessage && (
        <div className="border-l-4 border-[var(--accent-red)] bg-[var(--accent-red)]/10 p-4 text-[var(--accent-red)] font-medium">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
