import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

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
      { error: "Only @iitg.ac.in email addresses can submit scraped source rows." },
      { status: 403 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can submit scraped source rows." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        sourceId?: string;
        rawContent?: string | null;
        rawUrl?: string | null;
        posterUrl?: string | null;
      }
    | null;

  const sourceId = body?.sourceId?.trim() ?? "";
  const rawContent = body?.rawContent?.trim() || null;
  const rawUrl = body?.rawUrl?.trim() || null;
  const posterUrl = body?.posterUrl?.trim() || null;

  if (!sourceId || (!rawContent && !rawUrl && !posterUrl)) {
    return NextResponse.json(
      { error: "Provide a source and at least one raw content field." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("scraped_raw").insert({
    source_id: sourceId,
    raw_content: rawContent,
    raw_url: rawUrl,
    poster_url: posterUrl,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not store scraped raw row." },
      { status: 400 },
    );
  }

  await supabase
    .from("scraping_sources")
    .update({ last_scraped_at: new Date().toISOString() })
    .eq("id", sourceId);

  return NextResponse.json({ message: "Scraped row stored for extraction." });
}
