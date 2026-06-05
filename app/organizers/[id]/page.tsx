import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { EVENT_SELECT_COLUMNS, formatEventDateRange, type EventRow } from "@/app/utils/events";
import { FollowAction } from "@/components/events/follow-action";
import { ROLE_DETAILS, isPrivilegedRole, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";
import { Navbar } from "@/components/layout/Navbar";

type OrganizerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/organizers/${id}`);
  }

  if (!isAllowedCollegeEmail(user.email)) {
    redirect("/login?error=unauthorized_domain");
  }

  const { data: organizer } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, is_attendance_public, created_at")
    .eq("id", id)
    .maybeSingle<UserProfile>();

  if (!organizer) {
    notFound();
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("organizer_profile_id", organizer.id)
    .eq("status", "published")
    .order("start_time", { ascending: true })
    .returns<EventRow[]>();

  const organizerEvents = events ?? [];

  const categoryCount = new Set(organizerEvents.map((event) => event.category)).size;
  const roleDetail = ROLE_DETAILS[organizer.role];
  const canFollowOrganizer = isPrivilegedRole(organizer.role);

  const { count: followerCount } = await supabase
    .from("organizer_follows")
    .select("id", { count: "exact", head: true })
    .eq("organizer_profile_id", organizer.id);

  const { data: myFollow } = await supabase
    .from("organizer_follows")
    .select("id")
    .eq("organizer_profile_id", organizer.id)
    .eq("follower_id", user.id)
    .maybeSingle<{ id: string }>();

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-[var(--background)] pb-20">
      <Navbar user={user} />
      <main className="container mx-auto px-6 py-10 animate-fade-in-up">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          <div className="flex items-center justify-between gap-4 border-b-4 border-[var(--foreground)] pb-4">
            <Link
              href="/events"
              className="inline-block border-2 border-[var(--foreground)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-all hover:bg-[var(--foreground)] hover:text-[var(--background)]"
            >
              ← Back to feed
            </Link>
            <span className="bg-[var(--accent-blue)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white">
              {roleDetail.label}
            </span>
          </div>

          <header className="glass-card p-8 lg:p-12 border-t-8 border-t-[var(--accent-red)]">
            <div className="flex flex-col gap-6 md:flex-row md:items-start border-b-2 border-[var(--border-color)] pb-10">
              <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center border-4 border-[var(--foreground)] bg-transparent text-4xl font-serif font-bold text-[var(--foreground)]">
                {(organizer.full_name ?? organizer.email).slice(0, 1).toUpperCase()}
              </div>
              <div className="flex flex-col flex-grow">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
                  Organizer profile
                </p>
                <h1 className="editorial-heading mt-2 text-4xl sm:text-5xl">
                  {organizer.full_name ?? organizer.email}
                </h1>
                <p className="mt-4 max-w-2xl text-lg font-serif italic text-[var(--ink-800)] dark:text-gray-300">
                  {roleDetail.summary}
                </p>
                {canFollowOrganizer && organizer.id !== user.id && (
                  <div className="mt-6">
                    <FollowAction
                      organizerId={organizer.id}
                      initialFollowing={Boolean(myFollow)}
                      initialCount={followerCount ?? 0}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <div className="border-l-4 border-[var(--foreground)] pl-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">
                  Categories
                </p>
                <p className="mt-2 font-serif text-4xl font-bold text-[var(--foreground)]">{categoryCount}</p>
              </div>
              <div className="border-l-4 border-[var(--foreground)] pl-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">
                  Published Total
                </p>
                <p className="mt-2 font-serif text-4xl font-bold text-[var(--foreground)]">{events?.length ?? 0}</p>
              </div>
              <div className="border-l-4 border-[var(--foreground)] pl-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">
                  Followers
                </p>
                <p className="mt-2 font-serif text-4xl font-bold text-[var(--foreground)]">{followerCount ?? 0}</p>
              </div>
            </div>
          </header>

          <section className="glass-card p-8 lg:p-12 border-t-8 border-t-[var(--foreground)]">
            <div className="flex items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
                  Events
                </p>
                <h2 className="editorial-heading mt-2 text-3xl">
                  Published by this organizer
                </h2>
              </div>
            </div>

            {eventsError && (
              <div className="border-l-4 border-[var(--accent-red)] bg-[var(--accent-red)]/10 p-4 text-[var(--accent-red)] font-medium">
                Could not load organizer events.
              </div>
            )}

            {!eventsError && (!events || events.length === 0) && (
              <div className="border-2 border-dashed border-[var(--border-color)] p-12 text-center">
                <p className="font-serif text-2xl font-bold text-[var(--foreground)]">No published events yet</p>
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">
                  Future events from this organizer will appear here.
                </p>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events?.map((event) => (
                <article
                  key={event.id}
                  className="group flex flex-col border-2 border-[var(--foreground)] bg-transparent hover:bg-[var(--foreground)] transition-colors duration-300"
                >
                  {event.poster_url && (
                    <div
                      className="aspect-square w-full border-b-2 border-[var(--foreground)] bg-slate-200 bg-cover bg-center grayscale transition-all duration-500 group-hover:grayscale-0"
                      style={{ backgroundImage: `url(${event.poster_url})` }}
                      aria-label={`${event.title} poster`}
                    />
                  )}
                  <div className="flex flex-col flex-grow p-6 group-hover:text-[var(--background)]">
                    <span className="self-start bg-[var(--foreground)] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[var(--background)] group-hover:bg-[var(--background)] group-hover:text-[var(--foreground)]">
                      {event.category}
                    </span>
                    <h3 className="editorial-heading mt-4 text-xl line-clamp-2">
                      {event.title}
                    </h3>
                    <div className="mt-4 flex flex-col gap-1 border-t-2 border-[var(--border-color)] group-hover:border-white/20 pt-4">
                      <p className="text-xs font-bold uppercase tracking-widest">
                        {formatEventDateRange(event.start_time, event.end_time)}
                      </p>
                      {event.location && (
                        <p className="font-serif text-sm italic opacity-80">
                          {event.location}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/events/${event.id}`}
                      className="mt-6 self-start border-b-2 border-current pb-1 text-xs font-bold uppercase tracking-widest transition-opacity hover:opacity-70"
                    >
                      Open details →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
