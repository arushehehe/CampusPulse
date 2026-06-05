import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import {
  EVENT_CATEGORIES,
  EVENT_STATUSES,
  type EventRow,
  type EventStatus,
} from "@/app/utils/events";
import { isPrivilegedRole, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const isValidCategory = (value: string): value is (typeof EVENT_CATEGORIES)[number] =>
  EVENT_CATEGORIES.includes(value as (typeof EVENT_CATEGORIES)[number]);

const isValidModerationStatus = (value: string): value is EventStatus =>
  EVENT_STATUSES.includes(value as EventStatus) &&
  ["rejected", "published"].includes(value);

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
      { error: "Only @iitg.ac.in email addresses can create events." },
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

  const body = (await request.json().catch(() => null)) as
    | {
        title?: string;
        description?: string;
        location?: string;
        category?: string;
        startTime?: string;
        endTime?: string;
        publishNow?: boolean;
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

  const canPublishDirectly = isPrivilegedRole(profile.role) && body?.publishNow !== false;

  const eventPayload = {
    title,
    description,
    location,
    category,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    poster_url: posterUrl,
    source_url: sourceUrl,
    source_type: canPublishDirectly
      ? profile.role === "admin"
        ? "official"
        : "organizer"
      : "community",
    status: canPublishDirectly ? "published" : "pending",
    organizer_profile_id: canPublishDirectly ? profile.id : null,
    created_by: profile.id,
    is_paid: isPaid,
    price,
    capacity,
  };

  const { data: insertedEvent, error: insertError } = await supabase
    .from("events")
    .insert(eventPayload)
    .select("id, title, organizer_profile_id, status")
    .single<Pick<EventRow, "id" | "title" | "organizer_profile_id" | "status">>();

  if (insertError || !insertedEvent) {
    return NextResponse.json(
      { error: insertError?.message || "Could not create the event." },
      { status: 400 },
    );
  }

  if (insertedEvent.status === "published" && insertedEvent.organizer_profile_id) {
    const { data: followers } = await supabase
      .from("organizer_follows")
      .select("follower_id")
      .eq("organizer_profile_id", insertedEvent.organizer_profile_id)
      .returns<Array<{ follower_id: string }>>();

    if (followers && followers.length > 0) {
      await supabase.from("notifications").insert(
        followers.map((follow) => ({
          user_id: follow.follower_id,
          event_id: insertedEvent.id,
          type: "followed_organizer_event",
          title: "New event from an organizer you follow",
          body: insertedEvent.title,
        })),
      );
    }
  }

  return NextResponse.json({
    message: canPublishDirectly
      ? "Event created and published successfully."
      : "Event submitted for moderation.",
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
      { error: "Only @iitg.ac.in email addresses can moderate events." },
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

  if (profile.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can moderate event submissions." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        eventId?: string;
        status?: string;
        reason?: string | null;
      }
    | null;

  const eventId = body?.eventId?.trim() ?? "";
  const status = body?.status?.trim() ?? "";
  const reason = body?.reason?.trim() || null;

  if (!eventId || !isValidModerationStatus(status)) {
    return NextResponse.json(
      { error: "Provide a valid event id and moderation status." },
      { status: 400 },
    );
  }

  if (status === "rejected" && !reason) {
    return NextResponse.json(
      { error: "A rejection reason is required." },
      { status: 400 },
    );
  }

  const { data: currentEvent, error: eventLookupError } = await supabase
    .from("events")
    .select("id, status")
    .eq("id", eventId)
    .maybeSingle<Pick<EventRow, "id" | "status">>();

  if (eventLookupError || !currentEvent) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from("events")
    .update({ status })
    .eq("id", currentEvent.id);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || "Could not moderate the event." },
      { status: 400 },
    );
  }

  const { error: historyError } = await supabase.from("event_moderation_actions").insert({
    event_id: currentEvent.id,
    moderator_id: profile.id,
    from_status: currentEvent.status,
    to_status: status,
    reason,
  });

  if (historyError) {
    return NextResponse.json(
      { error: historyError.message || "Event updated, but moderation history failed." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "Event moderation status updated.",
  });
}
