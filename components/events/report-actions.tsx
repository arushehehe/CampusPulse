"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  reportId: string;
};

export function ReportActions({ reportId }: Props) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateStatus = async (status: "reviewed" | "dismissed") => {
    setErrorMessage(null);
    setPendingStatus(status);

    const response = await fetch("/api/event-reports/review", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reportId,
        status,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setPendingStatus(null);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update report.");
      return;
    }

    router.refresh();
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateStatus("reviewed")}
          disabled={Boolean(pendingStatus)}
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          {pendingStatus === "reviewed" ? "Saving..." : "Mark reviewed"}
        </button>
        <button
          type="button"
          onClick={() => updateStatus("dismissed")}
          disabled={Boolean(pendingStatus)}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pendingStatus === "dismissed" ? "Dismissing..." : "Dismiss"}
        </button>
      </div>
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
