import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { EVENT_CATEGORIES, type EventRow } from "@/app/utils/events";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const isValidCategory = (value: string): value is (typeof EVENT_CATEGORIES)[number] =>
  EVENT_CATEGORIES.includes(value as (typeof EVENT_CATEGORIES)[number]);

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
      { error: "Only @iitg.ac.in email addresses can extract event sources." },
      { status: 403 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  if (profileError || !profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can create extracted event drafts." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        ingestionId?: string;
        title?: string;
        description?: string;
        location?: string;
        category?: string;
        startTime?: string;
        endTime?: string;
        posterUrl?: string | null;
        sourceUrl?: string | null;
        isPaid?: boolean;
        price?: number | null;
        capacity?: number | null;
      }
    | null;

  const ingestionId = body?.ingestionId?.trim() ?? "";
  const title = body?.title?.trim() ?? "";
  const description = body?.description?.trim() || null;
  const location = body?.location?.trim() || null;
  const category = body?.category?.trim() ?? "";
  const startTime = body?.startTime ?? "";
  const endTime = body?.endTime ?? "";
  const posterUrl = normalizeUrl(body?.posterUrl);
  const sourceUrl = normalizeUrl(body?.sourceUrl);
  const isPaid = Boolean(body?.isPaid);
  const price = isPaid && typeof body?.price === "number" ? body.price : null;
  const capacity = typeof body?.capacity === "number" && body.capacity > 0 ? body.capacity : null;

  if (!ingestionId || !title || !startTime || !endTime || !isValidCategory(category)) {
    return NextResponse.json(
      { error: "Provide an ingestion, title, category, start time, and end time." },
      { status: 400 },
    );
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Use valid date and time values." }, { status: 400 });
  }

  if (end.getTime() <= start.getTime()) {
    return NextResponse.json(
      { error: "End time must be later than the start time." },
      { status: 400 },
    );
  }

  const { data: ingestion, error: ingestionError } = await supabase
    .from("event_ingestions")
    .select("id, submitted_by")
    .eq("id", ingestionId)
    .maybeSingle<{ id: string; submitted_by: string }>();

  if (ingestionError || !ingestion) {
    return NextResponse.json({ error: "Event source not found." }, { status: 404 });
  }

  const { data: event, error: insertError } = await supabase
    .from("events")
    .insert({
      title,
      description,
      location,
      category,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      poster_url: posterUrl,
      source_url: sourceUrl,
      source_type: "community",
      status: "pending",
      organizer_profile_id: null,
      created_by: ingestion.submitted_by,
      is_paid: isPaid,
      price,
      capacity,
    })
    .select("id")
    .single<Pick<EventRow, "id">>();

  if (insertError || !event) {
    return NextResponse.json(
      { error: insertError?.message || "Could not create extracted event draft." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("event_ingestions")
    .update({
      extraction_status: "extracted",
      extraction_error: null,
      extracted_event_id: event.id,
      reviewed_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ingestion.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Draft created, but source status was not updated." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Extracted event draft created.", eventId: event.id });
}
