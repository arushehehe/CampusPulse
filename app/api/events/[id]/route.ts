import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { EVENT_CATEGORIES, type EventRow } from "@/app/utils/events";
import { isPrivilegedRole, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const isValidCategory = (value: string): value is (typeof EVENT_CATEGORIES)[number] =>
  EVENT_CATEGORIES.includes(value as (typeof EVENT_CATEGORIES)[number]);

const normalizePosterUrl = (value: string | undefined | null) => {
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
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
      { error: "Only @iitg.ac.in email addresses can edit events." },
      { status: 403 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Profile lookup failed. Sign in again after setting up the schema." },
      { status: 400 },
    );
  }

  const { data: currentEvent, error: eventError } = await supabase
    .from("events")
    .select("id, source_type, status, organizer_profile_id, created_by")
    .eq("id", id)
    .maybeSingle<
      Pick<EventRow, "id" | "source_type" | "status" | "organizer_profile_id" | "created_by">
    >();

  if (eventError || !currentEvent) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const isAdmin = profile.role === "admin";
  const isOrganizerOwner =
    isPrivilegedRole(profile.role) && currentEvent.organizer_profile_id === profile.id;
  const isCommunityOwner =
    currentEvent.created_by === profile.id &&
    currentEvent.source_type === "community" &&
    ["draft", "pending", "rejected"].includes(currentEvent.status);

  if (!isAdmin && !isOrganizerOwner && !isCommunityOwner) {
    return NextResponse.json(
      { error: "You do not have permission to edit this event." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
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

  const title = body?.title?.trim() ?? "";
  const description = body?.description?.trim() || null;
  const location = body?.location?.trim() || null;
  const category = body?.category?.trim() ?? "";
  const startTime = body?.startTime ?? "";
  const endTime = body?.endTime ?? "";
  const posterUrl = normalizePosterUrl(body?.posterUrl);
  const sourceUrl = normalizePosterUrl(body?.sourceUrl);
  const isPaid = Boolean(body?.isPaid);
  const price = isPaid && typeof body?.price === "number" ? body.price : null;
  const capacity = typeof body?.capacity === "number" && body.capacity > 0 ? body.capacity : null;

  if (!title || !startTime || !endTime || !isValidCategory(category)) {
    return NextResponse.json(
      { error: "Provide a title, valid category, start time, and end time." },
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

  const nextStatus =
    isCommunityOwner && currentEvent.status === "rejected" ? "pending" : currentEvent.status;

  const { error: updateError } = await supabase
    .from("events")
    .update({
      title,
      description,
      location,
      category,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      poster_url: posterUrl,
      source_url: sourceUrl,
      is_paid: isPaid,
      price,
      capacity,
      status: nextStatus,
    })
    .eq("id", currentEvent.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Could not update the event." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message:
      nextStatus === "pending" && currentEvent.status === "rejected"
        ? "Event updated and sent back for moderation."
        : "Event updated successfully.",
  });
}
