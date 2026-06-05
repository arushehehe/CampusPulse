import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { EVENT_SELECT_COLUMNS, type EventRow } from "@/app/utils/events";
import { isPrivilegedRole, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

export default async function OrganizerDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/organizer-dashboard");
  }

  if (!isAllowedCollegeEmail(user.email)) {
    redirect("/login?error=unauthorized_domain");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  if (!profile || !isPrivilegedRole(profile.role)) {
    redirect("/events");
  }

  const eventsQuery = supabase
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .order("start_time", { ascending: false })
    .limit(50);

  const { data: events, error: eventsError } =
    profile.role === "admin"
      ? await eventsQuery.returns<EventRow[]>()
      : await eventsQuery.eq("organizer_profile_id", profile.id).returns<EventRow[]>();

  const eventRows = events ?? [];
  const eventIds = eventRows.map((event) => event.id);

  const { data: rsvps } =
    eventIds.length > 0
      ? await supabase
          .from("rsvps")
          .select("event_id, status")
          .in("event_id", eventIds)
          .returns<Array<{ event_id: string; status: string }>>()
      : { data: [] };

  const totalViews = eventRows.reduce((sum, event) => sum + (event.view_count ?? 0), 0);
  const totalStars = eventRows.reduce((sum, event) => sum + (event.star_count ?? 0), 0);
  const totalRsvps = rsvps?.length ?? 0;
  const publishedCount = eventRows.filter((event) => event.status === "published").length;

  const rsvpsByEvent = new Map<string, number>();
  for (const rsvp of rsvps ?? []) {
    rsvpsByEvent.set(rsvp.event_id, (rsvpsByEvent.get(rsvp.event_id) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
              Organizer analytics
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Engagement dashboard
            </h1>
          </div>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Back to events
          </Link>
        </div>

        {eventsError && (
          <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
            Could not load analytics data.
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Events", value: eventRows.length },
            { label: "Published", value: publishedCount },
            { label: "RSVPs", value: totalRsvps },
            { label: "Views", value: totalViews },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {metric.label}
              </p>
              <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
                Event performance
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Views, RSVPs, and stars
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              Stars {totalStars}
            </span>
          </div>

          <div className="mt-6 grid gap-3">
            {eventRows.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="grid gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 transition hover:bg-sky-50 md:grid-cols-[1fr_auto_auto_auto]"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-950">
                    {event.title}
                  </span>
                  <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-slate-500">
                    {event.status} / {event.category}
                  </span>
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {event.view_count ?? 0} views
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {rsvpsByEvent.get(event.id) ?? 0} RSVPs
                </span>
                <span className="text-sm font-semibold text-slate-700">
                  {event.star_count ?? 0} stars
                </span>
              </Link>
            ))}
            {eventRows.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                No events are available for analytics yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
