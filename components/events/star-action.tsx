"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  initialStarred: boolean;
  initialCount: number;
};

export function StarAction({ eventId, initialStarred, initialCount }: Props) {
  const router = useRouter();
  const [isStarred, setIsStarred] = useState(initialStarred);
  const [count, setCount] = useState(initialCount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleStar = async () => {
    const nextStarred = !isStarred;
    setErrorMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/stars", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventId,
        starred: nextStarred,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update star.");
      return;
    }

    setIsStarred(nextStarred);
    setCount((currentCount) =>
      nextStarred ? currentCount + 1 : Math.max(currentCount - 1, 0),
    );
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleStar}
        disabled={isSubmitting}
        className={
          isStarred
            ? "bg-[var(--accent-red)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            : "border-2 border-[var(--accent-red)] bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--accent-red)] transition-colors hover:bg-[var(--accent-red)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isSubmitting ? "Saving..." : `${isStarred ? "★ Starred" : "☆ Star"} (${count})`}
      </button>
      {errorMessage && <p className="mt-2 font-bold text-[var(--accent-red)]">{errorMessage}</p>}
    </div>
  );
}
