import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { ROLE_DETAILS, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";
import { PrivacyToggle } from "@/components/events/privacy-toggle";
import { EventCard } from "@/components/ui/EventCard";
import {
  createEmptyRsvpCounts,
  EVENT_SELECT_COLUMNS,
  formatEventDateRange,
  type EventRow,
  type EventRsvpRow,
} from "@/app/utils/events";

export default async function ProfilePage() {
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
    .select("id, email, full_name, avatar_url, role, is_attendance_public, created_at")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const role = profile?.role ?? "student";
  const roleDetail = ROLE_DETAILS[role];

  // Fetch starred events
  const { data: stars } = await supabase
    .from("event_stars")
    .select("event_id")
    .eq("user_id", user.id);

  const starredEventIds = stars?.map((s) => s.event_id) ?? [];

  let starredEvents: EventRow[] = [];
  if (starredEventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select(EVENT_SELECT_COLUMNS)
      .in("id", starredEventIds)
      .order("start_time", { ascending: true })
      .returns<EventRow[]>();
    
    if (events) {
      starredEvents = events;
    }
  }

  // Fetch RSVPs for starred events
  const { data: rsvps } =
    starredEventIds.length > 0
      ? await supabase
          .from("rsvps")
          .select("id, event_id, user_id, status, created_at")
          .in("event_id", starredEventIds)
          .returns<EventRsvpRow[]>()
      : { data: [] };

  const rsvpCountsByEvent = new Map<string, number>();
  for (const id of starredEventIds) {
    rsvpCountsByEvent.set(id, 0);
  }

  for (const rsvp of rsvps ?? []) {
    const current = rsvpCountsByEvent.get(rsvp.event_id) ?? 0;
    rsvpCountsByEvent.set(rsvp.event_id, current + 1);
  }

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-[var(--background)] pb-20">
      <Navbar user={user} />
      
      <main className="container mx-auto px-6 py-10 animate-fade-in-up max-w-[1000px]">
        <header className="editorial-border mb-10 border-b-4 border-[var(--foreground)] pb-6">
          <Link
            href="/events"
            className="inline-block border border-[var(--foreground)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] mb-6"
          >
            ← Return to Feed
          </Link>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
            {roleDetail.label} Account
          </p>
          <h1 className="editorial-heading mt-2 text-5xl sm:text-6xl leading-none">
            Your Profile.
          </h1>
          <p className="mt-4 text-lg font-medium text-[var(--ink-800)] dark:text-gray-300 max-w-2xl">
            Manage your personal details, privacy settings, and view the events you've saved.
          </p>
        </header>

        <div className="grid gap-12 md:grid-cols-[1fr_2fr] items-start">
          
          <aside className="flex flex-col gap-8">
            <div className="glass-card flex flex-col p-6 border-t-8 border-t-[var(--foreground)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">Public Info</p>
              <p className="mt-4 text-xl font-serif font-bold text-[var(--foreground)]">{profile?.full_name || user.email}</p>
              <p className="mt-1 text-sm text-[var(--ink-800)] dark:text-gray-300">{user.email}</p>
            </div>

            <div className="glass-card flex flex-col p-6 border-l-4 border-l-[var(--accent-blue)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">Visibility</p>
              <p className="mt-2 text-sm font-medium text-[var(--ink-800)] dark:text-gray-300 mb-6">
                Toggle whether your name appears on public event attendance rosters.
              </p>
              {profile && <PrivacyToggle initialValue={profile.is_attendance_public} />}
            </div>
          </aside>

          <section className="flex flex-col gap-8">
            <div className="flex items-center justify-between border-b-2 border-[var(--border-color)] pb-4">
              <h2 className="editorial-heading text-3xl">Saved Events</h2>
              <span className="bg-[var(--foreground)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--background)]">
                {starredEvents.length} Saved
              </span>
            </div>

            {starredEvents.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] bg-[var(--background)]/50 p-8 text-center">
                <span className="font-serif text-4xl opacity-20">—</span>
                <p className="mt-4 text-xl font-bold font-serif text-[var(--foreground)]">No saved events.</p>
                <p className="mt-2 text-[var(--ink-700)] dark:text-gray-400">
                  You haven't starred any events yet. Check the main feed!
                </p>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2">
                {starredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    category={event.category}
                    date={formatEventDateRange(event.start_time, event.end_time)}
                    location={event.location || "TBA"}
                    posterUrl={event.poster_url || undefined}
                    isPaid={event.is_paid}
                    price={event.price || undefined}
                    rsvps={rsvpCountsByEvent.get(event.id) ?? 0}
                  />
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}
