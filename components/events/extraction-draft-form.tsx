"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_CATEGORIES } from "@/app/utils/events";

type Props = {
  ingestionId: string;
  posterUrl: string | null;
  sourceUrl: string | null;
};

export function ExtractionDraftForm({ ingestionId, posterUrl, sourceUrl }: Props) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createDraft = async (formData: FormData) => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/event-ingestions/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ingestionId,
        title: formData.get("title"),
        description: formData.get("description"),
        location: formData.get("location"),
        category: formData.get("category"),
        startTime: formData.get("startTime"),
        endTime: formData.get("endTime"),
        posterUrl,
        sourceUrl,
        isPaid,
        price: isPaid && formData.get("price") ? Number(formData.get("price")) : null,
        capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not create extracted event draft.");
      return;
    }

    router.refresh();
  };

  return (
    <form action={createDraft} className="mt-5 grid gap-3">
      <input
        name="title"
        placeholder="Extracted title"
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="startTime"
          type="datetime-local"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
          required
        />
        <input
          name="endTime"
          type="datetime-local"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="category"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
          required
        >
          {EVENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          name="location"
          placeholder="Location"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
        />
      </div>
      <textarea
        name="description"
        placeholder="Extracted description"
        className="min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
      />
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(event) => setIsPaid(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Paid
        </label>
        <input
          name="price"
          type="number"
          min="0"
          step="1"
          disabled={!isPaid}
          placeholder="Price"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 disabled:bg-slate-100"
        />
        <input
          name="capacity"
          type="number"
          min="1"
          placeholder="Capacity"
          className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
      >
        {isSubmitting ? "Creating..." : "Create extracted draft"}
      </button>
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}
    </form>
  );
}
