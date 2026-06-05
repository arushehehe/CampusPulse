"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  organizerId: string;
  initialFollowing: boolean;
  initialCount: number;
};

export function FollowAction({ organizerId, initialFollowing, initialCount }: Props) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleFollow = async () => {
    const nextFollowing = !isFollowing;
    setErrorMessage(null);
    setIsSubmitting(true);

    const response = await fetch("/api/follows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organizerId,
        following: nextFollowing,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    setIsSubmitting(false);

    if (!response.ok) {
      setErrorMessage(payload?.error ?? "Could not update follow state.");
      return;
    }

    setIsFollowing(nextFollowing);
    setCount((currentCount) =>
      nextFollowing ? currentCount + 1 : Math.max(currentCount - 1, 0),
    );
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleFollow}
        disabled={isSubmitting}
        className={
          isFollowing
            ? "bg-[var(--foreground)] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--background)] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            : "border-2 border-[var(--foreground)] bg-transparent px-6 py-3 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isSubmitting ? "Saving..." : isFollowing ? `Following (${count})` : `Follow (${count})`}
      </button>
      {errorMessage && <p className="text-xs font-bold text-[var(--accent-red)]">{errorMessage}</p>}
    </div>
  );
}
