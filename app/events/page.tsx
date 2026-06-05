import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Navbar } from "@/components/layout/Navbar";
import { FeedLayout } from "@/components/layout/FeedLayout";
import { EventCard } from "@/components/ui/EventCard";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import {
  createEmptyRsvpCounts,
  EVENT_SELECT_COLUMNS,
  formatEventDateRange,
  getCalendarDateRange,
  groupEventsByDay,
  isCalendarView,
  normalizeSingleSearchParam,
  type EventRow,
  type EventRsvpRow,
  type EventStarRow,
  type RsvpStatus,
} from "@/app/utils/events";
import { EventFilters } from "@/components/events/event-filters";
import { RsvpActions } from "@/components/events/rsvp-actions";
import { StarAction } from "@/components/events/star-action";
import { ROLE_DETAILS, isPrivilegedRole, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

type EventsPageProps = {
  searchParams?: Promise<{
    search?: string | string[];
    category?: string | string[];
    source?: string | string[];
    mode?: string | string[];
    calendarView?: string | string[];
    dateFrom?: string | string[];
    dateTo?: string | string[];
    price?: string | string[];
  }>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowedCollegeEmail(user.email)) {
    redirect("/login?error=unauthorized_domain");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, is_attendance_public, created_at")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const role = profile?.role ?? "student";
  const roleDetail = ROLE_DETAILS[role];
  const canCreateEvents = isPrivilegedRole(role);
  const canModerateEvents = role === "admin";

  const filters = {
    search: normalizeSingleSearchParam(resolvedSearchParams.search).trim(),
    category: normalizeSingleSearchParam(resolvedSearchParams.category).trim(),
    sourceType: normalizeSingleSearchParam(resolvedSearchParams.source).trim(),
    mode: normalizeSingleSearchParam(resolvedSearchParams.mode).trim() || "calendar",
    calendarView:
      normalizeSingleSearchParam(resolvedSearchParams.calendarView).trim() || "month",
    dateFrom: normalizeSingleSearchParam(resolvedSearchParams.dateFrom).trim(),
    dateTo: normalizeSingleSearchParam(resolvedSearchParams.dateTo).trim(),
    priceType: normalizeSingleSearchParam(resolvedSearchParams.price).trim(),
  };
  const calendarView = isCalendarView(filters.calendarView)
    ? filters.calendarView
    : "month";

  let eventsQuery = supabase
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .or(`status.eq.published,created_by.eq.${user.id}`)
    .order(filters.mode === "trending" ? "star_count" : "start_time", {
      ascending: filters.mode !== "trending",
    })
    .limit(filters.mode === "calendar" ? 200 : 18);

  if (filters.search) {
    const escapedSearch = filters.search.replace(/,/g, " ");
    eventsQuery = eventsQuery.textSearch("search_vector", escapedSearch, {
      type: "websearch",
      config: "english",
    });
  }

  if (filters.category) {
    eventsQuery = eventsQuery.eq("category", filters.category);
  }

  if (filters.sourceType) {
    eventsQuery = eventsQuery.eq("source_type", filters.sourceType);
  }

  if (filters.priceType === "free") {
    eventsQuery = eventsQuery.eq("is_paid", false);
  }

  if (filters.priceType === "paid") {
    eventsQuery = eventsQuery.eq("is_paid", true);
  }

  if (filters.dateFrom) {
    eventsQuery = eventsQuery.gte("start_time", new Date(`${filters.dateFrom}T00:00:00`).toISOString());
  }

  if (filters.dateTo) {
    const dateTo = new Date(`${filters.dateTo}T00:00:00`);
    dateTo.setDate(dateTo.getDate() + 1);
    eventsQuery = eventsQuery.lt("start_time", dateTo.toISOString());
  }

  if (filters.mode === "calendar" && !filters.dateFrom && !filters.dateTo) {
    const { start, end } = getCalendarDateRange(calendarView);
    eventsQuery = eventsQuery.gte("start_time", start.toISOString()).lt("start_time", end.toISOString());
  }

  if (filters.mode === "trending") {
    eventsQuery = eventsQuery.eq("source_type", "community").gte("star_count", 1);
  }

  if (filters.mode === "following") {
    const { data: follows } = await supabase
      .from("organizer_follows")
      .select("organizer_profile_id")
      .eq("follower_id", user.id);
    
    const followedIds = follows?.map((f) => f.organizer_profile_id) ?? [];
    if (followedIds.length > 0) {
      eventsQuery = eventsQuery.in("organizer_profile_id", followedIds);
    } else {
      eventsQuery = eventsQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // Force empty
    }
  }

  const { data: events, error: eventsError } = await eventsQuery.returns<EventRow[]>();

  const eventIds = events?.map((event) => event.id) ?? [];

  const { data: rsvps, error: rsvpsError } =
    eventIds.length > 0
      ? await supabase
          .from("rsvps")
          .select("id, event_id, user_id, status, created_at")
          .in("event_id", eventIds)
          .returns<EventRsvpRow[]>()
      : { data: [], error: null };

  const { data: stars } =
    eventIds.length > 0
      ? await supabase
          .from("event_stars")
          .select("id, event_id, user_id, created_at")
          .in("event_id", eventIds)
          .eq("user_id", user.id)
          .returns<EventStarRow[]>()
      : { data: [] };

  const starredEventIds = new Set((stars ?? []).map((star) => star.event_id));
  const calendarGroups = groupEventsByDay(events ?? []);

  const rsvpStateByEvent = new Map<
    string,
    { mine: RsvpStatus | null; counts: Record<RsvpStatus, number> }
  >();

  for (const eventId of eventIds) {
    rsvpStateByEvent.set(eventId, {
      mine: null,
      counts: createEmptyRsvpCounts(),
    });
  }

  for (const rsvp of rsvps ?? []) {
    const current = rsvpStateByEvent.get(rsvp.event_id);
    if (!current) {
      continue;
    }

    current.counts[rsvp.status] += 1;

    if (rsvp.user_id === user.id) {
      current.mine = rsvp.status;
    }
  }

  const sidebarContent = (
    <>
      <div className="hidden lg:block border-b-4 border-[var(--foreground)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
          {roleDetail.label} Access
        </p>
        <h1 className="editorial-heading mt-2 text-5xl leading-none">
          The Daily<br/>Pulse.
        </h1>
      </div>

      <Link
        href="/events/create"
        className="w-full text-center border-2 border-[var(--foreground)] bg-[var(--foreground)] px-4 py-4 text-sm font-bold uppercase tracking-widest text-[var(--background)] transition-all hover:bg-transparent hover:text-[var(--foreground)]"
      >
        + Publish Event
      </Link>

      <div className="glass-card flex flex-col p-6 border-l-4 border-l-[var(--foreground)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">Dashboard</p>
        <div className="mt-4 flex flex-col gap-3">
          <Link href="/profile" className="font-bold text-[var(--foreground)] hover:text-[var(--accent-blue)]">Your Profile</Link>
          <Link href="/notifications" className="font-bold text-[var(--foreground)] hover:text-[var(--accent-blue)]">Alerts & Notifications</Link>
          {canModerateEvents && (
            <Link href="/moderation" className="font-bold text-[var(--foreground)] hover:text-[var(--accent-blue)]">HQ Moderation</Link>
          )}
          {canCreateEvents && (
            <Link href="/organizer-dashboard" className="font-bold text-[var(--foreground)] hover:text-[var(--accent-blue)]">Organizer Analytics</Link>
          )}
          <a href="/api/calendar" className="font-bold text-[var(--foreground)] hover:text-[var(--accent-blue)]">Export Calendar (iCal)</a>
        </div>
      </div>

      <div className="glass-card flex flex-col p-6">
        <EventFilters
          search={filters.search}
          category={filters.category}
          sourceType={filters.sourceType}
          mode={filters.mode}
          calendarView={calendarView}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          priceType={filters.priceType}
        />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-[var(--background)] pb-20">
      <Navbar user={user} />
      
      {/* Mobile Header (Hidden on Desktop) */}
      <div className="container mx-auto px-6 pt-10 pb-2 block lg:hidden">
        <header className="editorial-border mb-4 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
            {roleDetail.label} Access
          </p>
          <h1 className="editorial-heading mt-2 text-4xl sm:text-5xl">
            The Campus Feed.
          </h1>
        </header>
      </div>

      <FeedLayout sidebar={sidebarContent}>
        {profileError && (
          <div className="border-l-4 border-[var(--accent-red)] bg-[var(--accent-red)]/10 p-4 text-[var(--accent-red)] font-medium">
            Database issue: Could not read `profiles`. Please check Supabase setup.
          </div>
        )}
        {eventsError ? (
          <div className="border-l-4 border-[var(--accent-red)] bg-[var(--accent-red)]/10 p-4 text-[var(--accent-red)] font-medium">
            We could not load events yet. Check Supabase connection.
          </div>
        ) : null}

        {rsvpsError ? (
          <div className="border-l-4 border-amber-500 bg-amber-500/10 p-4 text-amber-700 font-medium dark:text-amber-400">
            RSVP data could not be read.
          </div>
        ) : null}

        {!eventsError && (!events || events.length === 0) ? (
          <div className="flex min-h-[400px] flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] bg-[var(--background)]/50 p-8 text-center">
            <span className="font-serif text-6xl opacity-20">—</span>
            <p className="mt-4 text-2xl font-bold font-serif text-[var(--foreground)]">No stories to display.</p>
            <p className="mt-2 text-lg text-[var(--ink-700)] dark:text-gray-400">
              {filters.mode === "following" 
                ? "You aren't following any organizers who have upcoming events."
                : "The feed is currently empty. Be the first to publish a new event."}
            </p>
          </div>
        ) : null}

        {filters.mode === "calendar" ? (
          <div className="grid gap-8">
            {calendarGroups.map((group) => (
              <div key={group.key} className="glass-card p-6 border-t-8 border-t-[var(--foreground)]">
                <h3 className="editorial-heading mb-6 text-3xl border-b-2 border-[var(--border-color)] pb-2">
                  {group.label}
                </h3>
                <div className="flex flex-col gap-12">
                  {group.events.map((event) => {
                    const totalRsvps = Object.values(rsvpStateByEvent.get(event.id)?.counts ?? createEmptyRsvpCounts()).reduce((a, b) => a + b, 0);
                    return (
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
                        rsvps={totalRsvps}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {events?.map((event) => {
              const totalRsvps = Object.values(rsvpStateByEvent.get(event.id)?.counts ?? createEmptyRsvpCounts()).reduce((a, b) => a + b, 0);
              return (
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
                  rsvps={totalRsvps}
                />
              );
            })}
          </div>
        )}
      </FeedLayout>
    </div>
  );
}
