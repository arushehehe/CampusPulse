import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import {
  EVENT_SELECT_COLUMNS,
  formatEventDateRange,
  type EventModerationActionRow,
  type EventRow,
} from "@/app/utils/events";
import { type EventIngestionRow } from "@/app/utils/ingestions";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";
import { IngestionActions } from "@/components/events/ingestion-actions";
import { ExtractionDraftForm } from "@/components/events/extraction-draft-form";
import { ModerationActions } from "@/components/events/moderation-actions";
import { ReportActions } from "@/components/events/report-actions";

type EventReportRow = {
  id: string;
  event_id: string;
  reporter_id: string;
  reason: string;
  notes: string | null;
  status: string;
  created_at: string;
};

export default async function ModerationPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/moderation");
  }

  if (!isAllowedCollegeEmail(user.email)) {
    redirect("/login?error=unauthorized_domain");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  if (profile?.role !== "admin") {
    redirect("/events");
  }

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .returns<EventRow[]>();

  const { data: moderationHistory } = await supabase
    .from("event_moderation_actions")
    .select("id, event_id, moderator_id, from_status, to_status, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<EventModerationActionRow[]>();

  const { data: ingestions, error: ingestionsError } = await supabase
    .from("event_ingestions")
    .select("id, source_type, source_url, poster_url, notes, extraction_status, extraction_error, extracted_event_id, submitted_by, reviewed_by, created_at, updated_at")
    .in("extraction_status", ["pending", "processing", "failed"])
    .order("created_at", { ascending: true })
    .returns<EventIngestionRow[]>();

  const { data: reports, error: reportsError } = await supabase
    .from("event_reports")
    .select("id, event_id, reporter_id, reason, notes, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .returns<EventReportRow[]>();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
              Admin moderation
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Review community submissions
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
            Could not load pending events. Re-run the latest schema policies and try again.
          </section>
        )}

        {!eventsError && (!events || events.length === 0) ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-950">No pending submissions</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Student-submitted community events will appear here before they are published.
            </p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2">
          {events?.map((event) => (
            <article
              key={event.id}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              {event.poster_url && (
                <div
                  className="mb-4 aspect-[16/9] rounded-[1.25rem] bg-slate-200 bg-cover bg-center"
                  style={{ backgroundImage: `url(${event.poster_url})` }}
                  aria-label={`${event.title} poster`}
                />
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {event.category}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                  {event.status}
                </span>
              </div>

              <h2 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">
                {event.title}
              </h2>
              <p className="mt-2 text-sm font-medium text-sky-700">
                {formatEventDateRange(event.start_time, event.end_time)}
              </p>
              {event.location && (
                <p className="mt-2 text-sm text-slate-600">Location: {event.location}</p>
              )}
              {event.description && (
                <p className="mt-3 text-sm leading-6 text-slate-600">{event.description}</p>
              )}

              <ModerationActions eventId={event.id} />
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-700">
              Extraction intake
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Raw links and posters
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              These are source materials submitted before LLM extraction turns them into
              structured event drafts.
            </p>
          </div>

          {ingestionsError ? (
            <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              Could not load event source submissions. Re-run the latest schema policies
              and try again.
            </div>
          ) : null}

          {!ingestionsError && (!ingestions || ingestions.length === 0) ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No raw event sources are waiting for extraction.
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {ingestions?.map((ingestion) => (
              <article
                key={ingestion.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
              >
                {ingestion.poster_url && (
                  <div
                    className="mb-4 aspect-[16/9] rounded-[1.25rem] bg-slate-200 bg-cover bg-center"
                    style={{ backgroundImage: `url(${ingestion.poster_url})` }}
                    aria-label="Submitted event poster"
                  />
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {ingestion.source_type}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                    {ingestion.extraction_status}
                  </span>
                </div>

                {ingestion.source_url && (
                  <a
                    href={ingestion.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex break-all text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                  >
                    {ingestion.source_url}
                  </a>
                )}

                {ingestion.notes && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {ingestion.notes}
                  </p>
                )}

                {ingestion.extraction_error && (
                  <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {ingestion.extraction_error}
                  </p>
                )}

                <p className="mt-4 text-xs text-slate-500">
                  Submitted {new Date(ingestion.created_at).toLocaleString("en-IN")}
                </p>

                <IngestionActions ingestionId={ingestion.id} />
                <ExtractionDraftForm
                  ingestionId={ingestion.id}
                  posterUrl={ingestion.poster_url}
                  sourceUrl={ingestion.source_url}
                />
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-rose-700">
              Reports
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              User-submitted content reports
            </h2>
          </div>

          {reportsError && (
            <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
              Could not load event reports. Apply the latest schema first.
            </div>
          )}

          {!reportsError && (!reports || reports.length === 0) && (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No open event reports.
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {reports?.map((report) => (
              <article
                key={report.id}
                className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    {report.reason}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(report.created_at).toLocaleString("en-IN")}
                  </span>
                </div>
                {report.notes && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{report.notes}</p>
                )}
                <Link
                  href={`/events/${report.event_id}`}
                  className="mt-4 inline-flex text-sm font-semibold text-sky-700 transition hover:text-sky-900"
                >
                  Open reported event
                </Link>
                <ReportActions reportId={report.id} />
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
              Audit trail
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Recent moderation decisions
            </h2>
          </div>

          {!moderationHistory || moderationHistory.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No moderation decisions have been recorded yet.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {moderationHistory.map((action) => (
                <div
                  key={action.id}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">
                      {action.from_status ?? "new"} {"->"} {action.to_status}
                    </p>
                    <span className="text-xs text-slate-500">
                      {new Date(action.created_at).toLocaleString("en-IN")}
                    </span>
                  </div>
                  {action.reason && (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Reason: {action.reason}
                    </p>
                  )}
                  <Link
                    href={`/events/${action.event_id}`}
                    className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 transition hover:text-sky-900"
                  >
                    Open event
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
