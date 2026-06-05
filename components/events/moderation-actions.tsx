"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventStatus } from "@/app/utils/events";

type Props = {
  eventId: string;
};

export function ModerationActions({ eventId }: Props) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<EventStatus | null>(null);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateStatus = async (status: EventStatus) => {
    setErrorMessage(null);

    if (status === "rejected" && !reason.trim()) {
      setErrorMessage("Add a short reason before rejecting.");
      return;
    }

    setPendingStatus(status);

    const response = await fetch("/api/events", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        status,
        reason: status === "rejected" ? reason : null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setPendingStatus(null);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update moderation status.");
      return;
    }

    router.refresh();
    setReason("");
  };

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateStatus("published")}
          disabled={Boolean(pendingStatus)}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          {pendingStatus === "published" ? "Publishing..." : "Publish"}
        </button>
        <button
          type="button"
          onClick={() => updateStatus("rejected")}
          disabled={Boolean(pendingStatus)}
          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingStatus === "rejected" ? "Rejecting..." : "Reject"}
        </button>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Rejection reason
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Required only when rejecting."
          className="min-h-20 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
        />
      </label>

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
