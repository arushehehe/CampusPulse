import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const isReportStatus = (value: string): value is "reviewed" | "dismissed" =>
  value === "reviewed" || value === "dismissed";

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
      { error: "Only @iitg.ac.in email addresses can review reports." },
      { status: 403 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Only admins can review reports." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        reportId?: string;
        status?: string;
      }
    | null;

  const reportId = body?.reportId?.trim() ?? "";
  const status = body?.status?.trim() ?? "";

  if (!reportId || !isReportStatus(status)) {
    return NextResponse.json(
      { error: "Provide a valid report and review status." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("event_reports")
    .update({
      status,
      reviewed_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update report." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Report updated." });
}
