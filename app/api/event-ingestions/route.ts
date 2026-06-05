import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import {
  EVENT_INGESTION_STATUSES,
  getIngestionSourceType,
  type EventIngestionStatus,
} from "@/app/utils/ingestions";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const normalizeUrl = (value: string | undefined | null) => {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const isValidIngestionStatus = (value: string): value is EventIngestionStatus =>
  EVENT_INGESTION_STATUSES.includes(value as EventIngestionStatus) &&
  ["pending", "processing", "failed", "dismissed"].includes(value);

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
      { error: "Only @iitg.ac.in email addresses can submit event sources." },
      { status: 403 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id">>();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile lookup failed. Sign in again after setting up the schema." },
      { status: 400 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        sourceUrl?: string | null;
        posterUrl?: string | null;
        notes?: string | null;
      }
    | null;

  const sourceUrl = normalizeUrl(body?.sourceUrl);
  const posterUrl = normalizeUrl(body?.posterUrl);
  const notes = body?.notes?.trim() || null;

  if (!sourceUrl && body?.sourceUrl?.trim()) {
    return NextResponse.json(
      { error: "Use a valid event source link starting with http or https." },
      { status: 400 },
    );
  }

  if (!posterUrl && body?.posterUrl?.trim()) {
    return NextResponse.json(
      { error: "Poster upload did not return a valid URL." },
      { status: 400 },
    );
  }

  if (!sourceUrl && !posterUrl && !notes) {
    return NextResponse.json(
      { error: "Add a source link, poster, or notes before submitting." },
      { status: 400 },
    );
  }

  const { error: insertError } = await supabase.from("event_ingestions").insert({
    source_type: getIngestionSourceType(sourceUrl, posterUrl),
    source_url: sourceUrl,
    poster_url: posterUrl,
    notes,
    submitted_by: profile.id,
  });

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message || "Could not submit the event source." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "Event source submitted for extraction review.",
  });
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
      { error: "Only @iitg.ac.in email addresses can review event sources." },
      { status: 403 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile lookup failed. Sign in again after setting up the schema." },
      { status: 400 },
    );
  }

  if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can review event source submissions." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        ingestionId?: string;
        status?: string;
        extractionError?: string | null;
      }
    | null;

  const ingestionId = body?.ingestionId?.trim() ?? "";
  const status = body?.status?.trim() ?? "";
  const extractionError = body?.extractionError?.trim() || null;

  if (!ingestionId || !isValidIngestionStatus(status)) {
    return NextResponse.json(
      { error: "Provide a valid ingestion id and extraction status." },
      { status: 400 },
    );
  }

  if (status === "failed" && !extractionError) {
    return NextResponse.json(
      { error: "Add an extraction error before marking the source as failed." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("event_ingestions")
    .update({
      extraction_status: status,
      extraction_error: status === "failed" ? extractionError : null,
      reviewed_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ingestionId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Could not update the source review." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "Event source review updated.",
  });
}
