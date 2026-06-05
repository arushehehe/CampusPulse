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
      { error: "Only @iitg.ac.in email addresses can read embedding jobs." },
      { status: 403 },
    );
  }

  const profile = await getAdminProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Only admins can read embedding jobs." },
      { status: 403 },
    );
  }

  const { data: jobs, error } = await supabase
    .from("embedding_jobs")
    .select("id, entity_type, entity_id, status, attempts, error, created_at, updated_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(25);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not load embedding jobs." },
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
      { error: "Only @iitg.ac.in email addresses can update embedding jobs." },
      { status: 403 },
    );
  }

  const profile = await getAdminProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Only admins can update embedding jobs." },
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

  const { error } = await supabase
    .from("embedding_jobs")
    .update({
      status,
      error: status === "failed" ? body?.error?.trim() || "Embedding failed." : null,
      attempts: status === "processing" ? 1 : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update embedding job." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Embedding job updated." });
}
