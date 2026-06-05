"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { EventIngestionStatus } from "@/app/utils/ingestions";

type Props = {
  ingestionId: string;
};

export function IngestionActions({ ingestionId }: Props) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<EventIngestionStatus | null>(null);
  const [extractionError, setExtractionError] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateStatus = async (status: EventIngestionStatus) => {
    setErrorMessage(null);

    if (status === "failed" && !extractionError.trim()) {
      setErrorMessage("Add a short error before marking extraction as failed.");
      return;
    }

    setPendingStatus(status);

    const response = await fetch("/api/event-ingestions", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ingestionId,
        status,
        extractionError: status === "failed" ? extractionError : null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setPendingStatus(null);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update the source review.");
      return;
    }

    setExtractionError("");
    router.refresh();
  };

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateStatus("processing")}
          disabled={Boolean(pendingStatus)}
          className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {pendingStatus === "processing" ? "Starting..." : "Mark processing"}
        </button>
        <button
          type="button"
          onClick={() => updateStatus("dismissed")}
          disabled={Boolean(pendingStatus)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingStatus === "dismissed" ? "Dismissing..." : "Dismiss"}
        </button>
        <button
          type="button"
          onClick={() => updateStatus("failed")}
          disabled={Boolean(pendingStatus)}
          className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingStatus === "failed" ? "Saving..." : "Mark failed"}
        </button>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Extraction error
        </span>
        <textarea
          value={extractionError}
          onChange={(event) => setExtractionError(event.target.value)}
          placeholder="Required only when marking failed."
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
