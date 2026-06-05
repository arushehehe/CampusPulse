"use client";

import { FormEvent, useState } from "react";

type Props = {
  eventId: string;
};

export function ReportEventForm({ eventId }: Props) {
  const [reason, setReason] = useState("Incorrect details");
  const [notes, setNotes] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/event-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        reason,
        notes,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not submit report.");
      return;
    }

    setStatusMessage(payload?.message ?? "Report submitted.");
    setNotes("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 border-2 border-[var(--foreground)] p-6 bg-transparent"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400 mb-4 border-b-2 border-[var(--foreground)] pb-2">
        Report event
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_2fr_auto]">
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full border-b-2 border-t-0 border-x-0 border-[var(--foreground)] bg-transparent px-0 py-3 text-sm font-bold uppercase tracking-widest text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
        >
          <option>Incorrect details</option>
          <option>Duplicate event</option>
          <option>Spam or unsafe</option>
          <option>Other</option>
        </select>
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional context"
          className="w-full border-b-2 border-t-0 border-x-0 border-[var(--foreground)] bg-transparent px-0 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[var(--foreground)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--background)] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isSubmitting ? "Sending..." : "Report"}
        </button>
      </div>
      {errorMessage && (
        <div className="mt-4 border-l-4 border-[var(--accent-red)] bg-[var(--accent-red)]/10 p-4 text-[var(--accent-red)] font-medium">
          {errorMessage}
        </div>
      )}
      {statusMessage && (
        <div className="mt-4 border-l-4 border-emerald-500 bg-emerald-50 p-4 text-emerald-700 font-medium dark:bg-emerald-950 dark:text-emerald-400">
          {statusMessage}
        </div>
      )}
    </form>
  );
}
