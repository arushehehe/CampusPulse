"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { EVENT_CATEGORIES } from "@/app/utils/events";
import { uploadEventPoster } from "@/app/utils/poster-upload";

type Props = {
  roleLabel: string;
  canPublishDirectly: boolean;
};

export function CreateEventForm({ roleLabel, canPublishDirectly }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState<(typeof EVENT_CATEGORIES)[number]>("Tech");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterInputKey, setPosterInputKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

    let posterUrl: string | null = null;

    try {
      if (posterFile) {
        posterUrl = await uploadEventPoster(posterFile);
      }
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not upload poster.");
      return;
    }

    const response = await fetch("/api/events", {
      method: "POST",
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
        publishNow: canPublishDirectly,
        posterUrl,
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
      setErrorMessage(payload?.error ?? "Could not create the event.");
      return;
    }

    setStatusMessage(
      payload?.message ?? "Event created successfully and added to the feed.",
    );
    setTitle("");
    setDescription("");
    setLocation("");
    setCategory("Tech");
    setStartTime("");
    setEndTime("");
    setSourceUrl("");
    setIsPaid(false);
    setPrice("");
    setCapacity("");
    setPosterFile(null);
    setPosterInputKey((current) => current + 1);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 border-b-2 border-[var(--foreground)] pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
            Create event
          </p>
          <h2 className="editorial-heading mt-2 text-3xl">
            {canPublishDirectly ? `Publish as ${roleLabel}` : "Submit a community event"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-800)] dark:text-gray-300">
            {canPublishDirectly
              ? "Organizer and admin events are written directly to Supabase and published immediately."
              : "Student submissions enter the moderation queue first. Once approved, they appear in the main feed."}
          </p>
        </div>
        <span className="bg-[var(--accent-red)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
          {canPublishDirectly ? "Direct publish" : "Moderated"}
        </span>
      </div>

      <form className="mt-2 grid gap-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Title</span>
          <input
            className="w-full border-b-2 border-t-0 border-x-0 border-[var(--foreground)] bg-transparent px-0 py-3 text-2xl font-serif text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Monsoon Hack Night"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Category</span>
          <select
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof EVENT_CATEGORIES)[number])}
          >
            {EVENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Location</span>
          <input
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Lecture Hall Complex"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Start time</span>
          <input
            type="datetime-local"
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">End time</span>
          <input
            type="datetime-local"
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            required
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Description</span>
          <textarea
            className="min-h-32 w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What is happening, who should attend, and why it matters."
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Source link</span>
          <input
            type="url"
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://..."
          />
        </label>

        <div className="grid gap-4 border-t-2 border-[var(--foreground)] pt-6 md:col-span-2 md:grid-cols-3">
          <label className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-[var(--foreground)]">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(event) => setIsPaid(event.target.checked)}
              className="h-5 w-5 accent-[var(--foreground)]"
            />
            Paid event
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Price</span>
            <input
              type="number"
              min="0"
              step="1"
              disabled={!isPaid}
              className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)] disabled:opacity-50"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Capacity</span>
            <input
              type="number"
              min="1"
              className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
        </div>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Poster image</span>
          <input
            key={posterInputKey}
            type="file"
            accept="image/*"
            onChange={(event) => setPosterFile(event.target.files?.[0] ?? null)}
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] file:mr-4 file:border-0 file:bg-[var(--foreground)] file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-[var(--background)] hover:file:bg-[var(--accent-blue)] transition-colors cursor-pointer"
          />
          <p className="text-xs text-[var(--ink-700)] dark:text-gray-400 mt-2">
            Optional. Use a clear event poster under 5 MB.
          </p>
        </label>

        <div className="md:col-span-2 flex flex-col gap-3 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[var(--foreground)] px-6 py-4 text-sm font-bold uppercase tracking-widest text-[var(--background)] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting
              ? "Saving event..."
              : canPublishDirectly
                ? "Create event"
                : "Submit for review"}
          </button>

          {errorMessage && (
             <div className="border-l-4 border-[var(--accent-red)] bg-[var(--accent-red)]/10 p-4 text-[var(--accent-red)] font-medium">
              {errorMessage}
            </div>
          )}

          {statusMessage && (
            <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 text-emerald-700 font-medium dark:bg-emerald-950 dark:text-emerald-400">
              {statusMessage}
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
