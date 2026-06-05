import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import {
  createEmptyRsvpCounts,
  EVENT_SELECT_COLUMNS,
  type EventAttendeeRow,
  formatEventDateRange,
  type EventModerationActionRow,
  type EventRow,
  type EventRsvpRow,
  type EventStarRow,
  type RsvpStatus,
} from "@/app/utils/events";
import { EditEventForm } from "@/components/events/edit-event-form";
import { ReportEventForm } from "@/components/events/report-event-form";
import { RsvpActions } from "@/components/events/rsvp-actions";
import { StarAction } from "@/components/events/star-action";
import { isPrivilegedRole, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

type EventDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowedCollegeEmail(user.email)) {
    redirect("/login?error=unauthorized_domain");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  const { data: event } = await supabase
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle<EventRow>();

  if (!event) {
    notFound();
  }

  await supabase.rpc("increment_event_view_count", {
    event_id: event.id,
  });

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("id, event_id, user_id, status, created_at")
    .eq("event_id", event.id)
    .returns<EventRsvpRow[]>();

  const { data: moderationHistory } = await supabase
    .from("event_moderation_actions")
    .select("id, event_id, moderator_id, from_status, to_status, reason, created_at")
    .eq("event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(3)
    .returns<EventModerationActionRow[]>();

  const { data: stars } = await supabase
    .from("event_stars")
    .select("id, event_id, user_id, created_at")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .returns<EventStarRow[]>();

  const { data: publicAttendees } = await supabase
    .from("rsvps")
    .select("status, profiles(id, email, full_name, avatar_url, is_attendance_public)")
    .eq("event_id", event.id)
    .eq("status", "going")
    .returns<EventAttendeeRow[]>();

  const counts = createEmptyRsvpCounts();
  let myStatus: RsvpStatus | null = null;

  for (const rsvp of rsvps ?? []) {
    counts[rsvp.status] += 1;

    if (profile && rsvp.user_id === profile.id) {
      myStatus = rsvp.status;
    }
  }

  const canEditEvent = Boolean(
    profile &&
      (profile.role === "admin" ||
        (isPrivilegedRole(profile.role) && event.organizer_profile_id === profile.id) ||
        (event.created_by === profile.id &&
          event.source_type === "community" &&
          ["draft", "pending", "rejected"].includes(event.status))),
  );

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-[var(--background)] pb-20">
      <Navbar user={user} />
      
      <main className="container mx-auto px-6 py-10 animate-fade-in-up">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 editorial-border border-b-0 pb-0">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/events"
                className="inline-block border border-[var(--foreground)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-all hover:bg-[var(--foreground)] hover:text-[var(--background)]"
              >
                ← Return to Feed
              </Link>
              {event.organizer_profile_id && (
                <Link
                  href={`/organizers/${event.organizer_profile_id}`}
                  className="inline-block border border-[var(--foreground)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-all hover:bg-[var(--foreground)] hover:text-[var(--background)]"
                >
                  View Organizer
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-[var(--foreground)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--background)]">
                {event.status}
              </span>
              {event.status === "published" && (
                <a
                  href={`/api/events/${event.id}/calendar`}
                  className="inline-block border border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--accent-blue)] transition-all hover:bg-[var(--accent-blue)] hover:text-white"
                >
                  + Calendar
                </a>
              )}
            </div>
          </header>

          <article className="glass-card overflow-hidden">
            {event.poster_url && (
              <div className="flex justify-center w-full bg-slate-50 dark:bg-[#121212] py-6 border-b-4 border-[var(--foreground)]">
                <div
                  className="w-full bg-slate-200 bg-cover bg-center grayscale transition-all duration-700 hover:grayscale-0 hover:scale-105 shadow-lg"
                  style={{ 
                    backgroundImage: `url(${event.poster_url})`,
                    aspectRatio: "4/5",
                    maxWidth: "480px"
                  }}
                  aria-label={`${event.title} poster`}
                />
              </div>
            )}

            <div className="p-8 lg:p-12">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="border-b-2 border-[var(--accent-blue)] pb-1 text-sm font-bold uppercase tracking-[0.2em] text-[var(--ink-800)] dark:text-gray-300">
                  {event.category}
                </span>
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
                  // {event.source_type}
                </span>
              </div>

              <h1 className="editorial-heading text-5xl sm:text-6xl lg:text-7xl mb-10 leading-[1.1]">
                {event.title}
              </h1>

              <div className="grid gap-8 md:grid-cols-3 border-y-2 border-[var(--border-color)] py-8 mb-10">
                <div className="flex flex-col border-l-4 border-l-[var(--foreground)] pl-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Date & Time</p>
                  <p className="mt-2 text-lg font-serif font-bold text-[var(--foreground)]">
                    {formatEventDateRange(event.start_time, event.end_time)}
                  </p>
                </div>
                <div className="flex flex-col border-l-4 border-l-[var(--foreground)] pl-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Location</p>
                  <p className="mt-2 text-lg font-serif font-bold text-[var(--foreground)]">
                    {event.location || "TBA"}
                  </p>
                </div>
                <div className="flex flex-col border-l-4 border-l-[var(--foreground)] pl-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Access</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.is_paid ? (
                      <span className="bg-[var(--accent-red)] px-2 py-1 text-xs font-bold uppercase tracking-widest text-white">
                        Paid{event.price ? `: ₹${event.price}` : ""}
                      </span>
                    ) : (
                      <span className="bg-[var(--foreground)] px-2 py-1 text-xs font-bold uppercase tracking-widest text-[var(--background)]">
                        Free
                      </span>
                    )}
                    {event.capacity && (
                      <span className="border border-[var(--border-color)] px-2 py-1 text-xs font-bold uppercase tracking-widest text-[var(--ink-800)] dark:text-gray-300">
                        Cap: {event.capacity}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="prose prose-lg dark:prose-invert max-w-none text-[var(--ink-800)] dark:text-gray-300 font-sans leading-relaxed">
                <p className="text-xl font-serif mb-6">{event.description || "No detailed description provided."}</p>
              </div>

              {event.source_url && (
                <div className="mt-8">
                  <a
                    href={event.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex border-b-2 border-[var(--foreground)] pb-1 text-sm font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue)]"
                  >
                    View Original Source ↗
                  </a>
                </div>
              )}
            </div>
          </article>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="glass-card p-8 border-t-8 border-t-[var(--accent-blue)]">
              <h3 className="editorial-heading text-2xl mb-6">Attendance & RSVP</h3>
              <RsvpActions eventId={event.id} initialStatus={myStatus} counts={counts} />
              
              <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400 mb-4">
                  Public Roster
                </p>
                <div className="flex flex-wrap gap-2">
                  {(publicAttendees ?? [])
                    .filter((attendee) => attendee.profiles?.is_attendance_public)
                    .slice(0, 12)
                    .map((attendee) => (
                      <span
                        key={attendee.profiles?.id}
                        className="bg-[var(--background)] border border-[var(--border-color)] px-3 py-1 text-xs font-bold text-[var(--foreground)]"
                      >
                        {attendee.profiles?.full_name ?? attendee.profiles?.email}
                      </span>
                    ))}
                  {(publicAttendees ?? []).filter((attendee) => attendee.profiles?.is_attendance_public).length === 0 && (
                    <p className="text-sm font-serif italic text-[var(--ink-700)] dark:text-gray-400">
                      No public attendees yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-8">
              {event.source_type === "community" && (
                <div className="glass-card p-8 border-t-8 border-t-[var(--accent-red)]">
                  <h3 className="editorial-heading text-xl mb-4">Community Support</h3>
                  <p className="text-sm text-[var(--ink-800)] dark:text-gray-300 mb-6">
                    Community events need 25 stars to auto-publish. Cast your vote.
                  </p>
                  <StarAction
                    eventId={event.id}
                    initialStarred={Boolean(stars?.length)}
                    initialCount={event.star_count ?? 0}
                  />
                </div>
              )}

              {moderationHistory && moderationHistory.length > 0 && (
                <div className="glass-card p-8 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-900/10">
                  <h3 className="editorial-heading text-xl mb-4 text-amber-900 dark:text-amber-500">Moderation Log</h3>
                  <div className="space-y-4">
                    {moderationHistory.map((action) => (
                      <div key={action.id} className="text-sm text-amber-800 dark:text-amber-400">
                        <p className="font-bold">
                          {action.from_status ?? "new"} → {action.to_status}
                        </p>
                        {action.reason && <p className="mt-1 font-serif italic">"{action.reason}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass-card p-6">
                <ReportEventForm eventId={event.id} />
              </div>
            </div>
          </div>

          {canEditEvent && (
            <div className="glass-card p-8 border-2 border-dashed border-[var(--border-color)] mt-8">
              <h3 className="editorial-heading text-2xl mb-6">Editor's Desk</h3>
              <EditEventForm event={event} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
