"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EVENT_CATEGORIES,
  formatDateTimeInputValue,
  type EventRow,
} from "@/app/utils/events";
import { uploadEventPoster } from "@/app/utils/poster-upload";

type Props = {
  event: EventRow;
};

export function EditEventForm({ event }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description ?? "");
  const [location, setLocation] = useState(event.location ?? "");
  const [category, setCategory] = useState<(typeof EVENT_CATEGORIES)[number]>(
    event.category as (typeof EVENT_CATEGORIES)[number],
  );
  const [startTime, setStartTime] = useState(formatDateTimeInputValue(event.start_time));
  const [endTime, setEndTime] = useState(formatDateTimeInputValue(event.end_time));
  const [posterUrl, setPosterUrl] = useState(event.poster_url ?? "");
  const [sourceUrl, setSourceUrl] = useState(event.source_url ?? "");
  const [isPaid, setIsPaid] = useState(Boolean(event.is_paid));
  const [price, setPrice] = useState(event.price?.toString() ?? "");
  const [capacity, setCapacity] = useState(event.capacity?.toString() ?? "");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterInputKey, setPosterInputKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!title.trim() || !startTime || !endTime) {
      setErrorMessage("Title, start time, and end time are required.");
      return;
    }

    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      setErrorMessage("End time must be later than the start time.");
      return;
    }

    setIsSubmitting(true);

    let nextPosterUrl = posterUrl.trim() || null;

    try {
      if (posterFile) {
        nextPosterUrl = await uploadEventPoster(posterFile);
      }
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not upload poster.");
      return;
    }

    const response = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        description,
        location,
        category,
        startTime,
        endTime,
        posterUrl: nextPosterUrl,
        sourceUrl,
        isPaid,
        price: isPaid && price ? Number(price) : null,
        capacity: capacity ? Number(capacity) : null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update the event.");
      return;
    }

    setPosterFile(null);
    setPosterInputKey((current) => current + 1);
    setPosterUrl(nextPosterUrl ?? "");
    setStatusMessage(payload?.message ?? "Event updated successfully.");
    router.refresh();
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
          Edit event
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          Update details and poster
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Community submissions can be edited before approval. Organizer and admin events
          can be maintained after publishing.
        </p>
      </div>

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white"
            value={title}
            onChange={(inputEvent) => setTitle(inputEvent.target.value)}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Category</span>
          <select
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white"
            value={category}
            onChange={(inputEvent) =>
              setCategory(inputEvent.target.value as (typeof EVENT_CATEGORIES)[number])
            }
          >
            {EVENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Location</span>
          <input
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white"
            value={location}
            onChange={(inputEvent) => setLocation(inputEvent.target.value)}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">Start time</span>
          <input
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white"
            value={startTime}
            onChange={(inputEvent) => setStartTime(inputEvent.target.value)}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-700">End time</span>
          <input
            type="datetime-local"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white"
            value={endTime}
            onChange={(inputEvent) => setEndTime(inputEvent.target.value)}
            required
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white"
            value={description}
            onChange={(inputEvent) => setDescription(inputEvent.target.value)}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Source link</span>
          <input
            type="url"
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:bg-white"
            value={sourceUrl}
            onChange={(inputEvent) => setSourceUrl(inputEvent.target.value)}
          />
        </label>

        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 md:grid-cols-3">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(inputEvent) => setIsPaid(inputEvent.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Paid event
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Price</span>
            <input
              type="number"
              min="0"
              step="1"
              disabled={!isPaid}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500 disabled:bg-slate-100"
              value={price}
              onChange={(inputEvent) => setPrice(inputEvent.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Capacity</span>
            <input
              type="number"
              min="1"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-500"
              value={capacity}
              onChange={(inputEvent) => setCapacity(inputEvent.target.value)}
            />
          </label>
        </div>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Poster image</span>
          <input
            key={posterInputKey}
            type="file"
            accept="image/*"
            onChange={(inputEvent) => setPosterFile(inputEvent.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-950 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white"
          />
          {posterUrl ? (
            <button
              type="button"
              onClick={() => {
                setPosterUrl("");
                setPosterFile(null);
                setPosterInputKey((current) => current + 1);
              }}
              className="text-xs font-semibold text-rose-700 transition hover:text-rose-900"
            >
              Remove current poster
            </button>
          ) : (
            <p className="text-xs text-slate-500">Optional. Use an image under 5 MB.</p>
          )}
        </label>

        <div className="md:col-span-2 flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSubmitting ? "Saving changes..." : "Save changes"}
          </button>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {statusMessage}
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
