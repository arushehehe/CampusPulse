import Link from "next/link";
import { CalendarIcon, MapPinIcon, TicketIcon, BookmarkIcon, HeartIcon, ShareIcon } from "lucide-react";

export interface EventCardProps {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  posterUrl?: string;
  isPaid?: boolean;
  price?: number;
  rsvps?: number;
}

export function EventCard({
  id,
  title,
  category,
  date,
  location,
  posterUrl,
  isPaid,
  price,
  rsvps = 0,
}: EventCardProps) {
  return (
    <article className="group relative flex flex-col border-b-4 border-[var(--foreground)] pb-12 transition-all duration-300">
      
      {/* Header Info */}
      <div className="flex items-center justify-between py-4">
        <span className="bg-[var(--foreground)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--background)]">
          {category}
        </span>
        {isPaid && (
          <span className="flex items-center gap-1 font-bold text-[var(--accent-red)] text-sm">
            <TicketIcon className="h-4 w-4" />
            {price ? `₹${price}` : "PAID"}
          </span>
        )}
      </div>

      {/* Magazine Cover / Instagram Image */}
      <div className="flex justify-center w-full bg-slate-50 dark:bg-[#121212] py-4 border-y border-[var(--border-color)]">
        <Link 
          href={`/events/${id}`} 
          className="block relative w-full overflow-hidden bg-slate-200 dark:bg-slate-800 shadow-md"
          style={{ aspectRatio: "4/5", maxWidth: "480px" }}
        >
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-serif text-8xl font-bold opacity-5">
              CP.
            </div>
          )}
        </Link>
      </div>

      {/* Action Bar (Instagram style) */}
      <div className="flex items-center justify-between py-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4 text-[var(--foreground)]">
          <button className="transition-transform hover:scale-110 hover:text-[var(--accent-red)]" aria-label="Like/Star">
            <HeartIcon className="h-6 w-6" />
          </button>
          <button className="transition-transform hover:scale-110 hover:text-[var(--accent-blue)]" aria-label="Comment/RSVP">
            <BookmarkIcon className="h-6 w-6" />
          </button>
          <button className="transition-transform hover:scale-110 hover:text-[var(--ink-700)]" aria-label="Share">
            <ShareIcon className="h-6 w-6" />
          </button>
        </div>
        <span className="text-sm font-bold text-[var(--ink-800)] dark:text-gray-300">
          {rsvps} {rsvps === 1 ? 'attendee' : 'attendees'}
        </span>
      </div>

      {/* Content Section */}
      <div className="pt-6">
        <Link href={`/events/${id}`} className="block">
          <h2 className="editorial-heading text-4xl sm:text-5xl leading-tight group-hover:text-[var(--accent-red)] transition-colors duration-300">
            {title}
          </h2>
        </Link>
        
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-6 text-sm font-medium text-[var(--ink-700)] dark:text-gray-400">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 shrink-0 text-[var(--foreground)]" />
            <span className="text-base">{date}</span>
          </div>
          <div className="hidden sm:block h-4 w-px bg-[var(--border-color)]"></div>
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 shrink-0 text-[var(--foreground)]" />
            <span className="text-base">{location}</span>
          </div>
        </div>

        <div className="mt-8">
          <Link 
            href={`/events/${id}`}
            className="inline-flex items-center gap-2 border-b-2 border-[var(--foreground)] pb-1 text-sm font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)]"
          >
            Read Full Story ↗
          </Link>
        </div>
      </div>

    </article>
  );
}
