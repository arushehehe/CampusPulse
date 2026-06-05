import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { createClient } from "@/app/utils/supabase/server";

type NotificationRow = {
  id: string;
  event_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
};

export default async function NotificationsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/notifications");
  }

  if (!isAllowedCollegeEmail(user.email)) {
    redirect("/login?error=unauthorized_domain");
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, event_id, type, title, body, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(40)
    .returns<NotificationRow[]>();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
              Notifications
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Campus updates</h1>
          </div>
          <Link
            href="/events"
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
          >
            Back to events
          </Link>
        </div>

        {error && (
          <section className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
            Could not load notifications. Apply the latest schema first.
          </section>
        )}

        <section className="grid gap-3">
          {(notifications ?? []).map((notification) => {
            const content = (
              <article className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">
                    {notification.title}
                  </p>
                  <span className="text-xs text-slate-500">
                    {new Date(notification.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                {notification.body && (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {notification.body}
                  </p>
                )}
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {notification.type.replace(/_/g, " ")}
                </p>
              </article>
            );

            return notification.event_id ? (
              <Link key={notification.id} href={`/events/${notification.event_id}`}>
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            );
          })}
          {!error && (!notifications || notifications.length === 0) && (
            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
              No notifications yet. Follow organizers to receive new-event updates.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
