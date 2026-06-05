"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadEventPoster } from "@/app/utils/poster-upload";

export function EventIngestionForm() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterInputKey, setPosterInputKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!sourceUrl.trim() && !notes.trim() && !posterFile) {
      setErrorMessage("Add a link, poster, or notes before submitting.");
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

    const response = await fetch("/api/event-ingestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceUrl,
        posterUrl,
        notes,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not submit the source.");
      return;
    }

    setStatusMessage(payload?.message ?? "Event source submitted.");
    setSourceUrl("");
    setNotes("");
    setPosterFile(null);
    setPosterInputKey((current) => current + 1);
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="border-b-2 border-[var(--foreground)] pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent-blue)]">
          Smart intake
        </p>
        <h2 className="editorial-heading mt-2 text-3xl">
          Submit a poster or event link
        </h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-800)] dark:text-gray-300">
          Drop raw source material here before it becomes a structured event. These
          records feed the admin extraction review queue.
        </p>
      </div>

      <form className="mt-2 grid gap-6" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Event link</span>
          <input
            type="url"
            className="w-full border-b-2 border-t-0 border-x-0 border-[var(--foreground)] bg-transparent px-0 py-3 text-lg font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={sourceUrl}
            onChange={(inputEvent) => setSourceUrl(inputEvent.target.value)}
            placeholder="https://instagram.com/p/..."
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Poster image</span>
          <input
            key={posterInputKey}
            type="file"
            accept="image/*"
            onChange={(inputEvent) => setPosterFile(inputEvent.target.files?.[0] ?? null)}
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm text-[var(--foreground)] file:mr-4 file:border-0 file:bg-[var(--foreground)] file:px-4 file:py-2 file:text-xs file:font-bold file:uppercase file:tracking-widest file:text-[var(--background)] hover:file:bg-[var(--accent-blue)] transition-colors cursor-pointer"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Notes</span>
          <textarea
            className="min-h-24 w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            value={notes}
            onChange={(inputEvent) => setNotes(inputEvent.target.value)}
            placeholder="Add context if the poster misses venue, timing, or organizer details."
          />
        </label>

        <div className="flex flex-col gap-3 mt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[var(--foreground)] px-6 py-4 text-sm font-bold uppercase tracking-widest text-[var(--background)] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isSubmitting ? "Submitting source..." : "Submit source"}
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
