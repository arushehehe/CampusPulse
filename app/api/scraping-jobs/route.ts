import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const getAdminProfile = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  return profile?.role === "admin" ? profile : null;
};

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in first." }, { status: 401 });
  }

  if (!isAllowedCollegeEmail(user.email)) {
    return NextResponse.json(
      { error: "Only @iitg.ac.in email addresses can read scraping jobs." },
      { status: 403 },
    );
  }

  const profile = await getAdminProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Only admins can read scraping jobs." },
      { status: 403 },
    );
  }

  const { data: jobs, error } = await supabase
    .from("scraping_jobs")
    .select("id, source_id, status, scheduled_for, started_at, completed_at, attempts, error, created_at, scraping_sources(type, handle_or_url)")
    .in("status", ["pending", "failed"])
    .order("scheduled_for", { ascending: true })
    .limit(25);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load scraping jobs." },
      { status: 400 },
    );
  }

  return NextResponse.json({ jobs: jobs ?? [] });
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in first." }, { status: 401 });
  }

  if (!isAllowedCollegeEmail(user.email)) {
    return NextResponse.json(
      { error: "Only @iitg.ac.in email addresses can update scraping jobs." },
      { status: 403 },
    );
  }

  const profile = await getAdminProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Only admins can update scraping jobs." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        jobId?: string;
        status?: "processing" | "completed" | "failed";
        error?: string | null;
      }
    | null;

  const jobId = body?.jobId?.trim() ?? "";
  const status = body?.status;

  if (!jobId || !["processing", "completed", "failed"].includes(status ?? "")) {
    return NextResponse.json(
      { error: "Provide a valid job id and status." },
      { status: 400 },
    );
  }

  const { data: job } = await supabase
    .from("scraping_jobs")
    .select("id, source_id")
    .eq("id", jobId)
    .maybeSingle<{ id: string; source_id: string }>();

  const { error } = await supabase
    .from("scraping_jobs")
    .update({
      status,
      started_at: status === "processing" ? new Date().toISOString() : undefined,
      completed_at: status === "completed" ? new Date().toISOString() : undefined,
      attempts: status === "processing" ? 1 : undefined,
      error: status === "failed" ? body?.error?.trim() || "Scraping failed." : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update scraping job." },
      { status: 400 },
    );
  }

  if (status === "completed" && job) {
    await supabase
      .from("scraping_sources")
      .update({ last_scraped_at: new Date().toISOString() })
      .eq("id", job.source_id);
  }

  return NextResponse.json({ message: "Scraping job updated." });
}
