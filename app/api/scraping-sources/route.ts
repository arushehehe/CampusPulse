import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const SOURCE_TYPES = ["official_site", "notice_board", "club_page", "instagram"] as const;

const isSourceType = (value: string): value is (typeof SOURCE_TYPES)[number] =>
  SOURCE_TYPES.includes(value as (typeof SOURCE_TYPES)[number]);

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

export async function POST(request: Request) {
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
      { error: "Only @iitg.ac.in email addresses can manage scraping sources." },
      { status: 403 },
    );
  }

  const profile = await getAdminProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Only admins can manage scraping sources." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        type?: string;
        handleOrUrl?: string;
      }
    | null;

  const type = body?.type?.trim() ?? "";
  const handleOrUrl = body?.handleOrUrl?.trim() ?? "";

  if (!isSourceType(type) || !handleOrUrl) {
    return NextResponse.json(
      { error: "Provide a valid source type and handle or URL." },
      { status: 400 },
    );
  }

  const { data: college } = await supabase
    .from("colleges")
    .select("id")
    .eq("email_domain", "iitg.ac.in")
    .maybeSingle<{ id: string }>();

  const { error } = await supabase.from("scraping_sources").upsert(
    {
      type,
      handle_or_url: handleOrUrl,
      college_id: college?.id ?? null,
      active: true,
      created_by: profile.id,
    },
    {
      onConflict: "type,handle_or_url",
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not save scraping source." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Scraping source saved." });
}
