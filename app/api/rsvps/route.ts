import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { RSVP_STATUSES, type EventRow, type RsvpStatus } from "@/app/utils/events";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const isValidRsvpStatus = (value: string): value is RsvpStatus =>
  RSVP_STATUSES.includes(value as RsvpStatus);

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
      { error: "Only @iitg.ac.in email addresses can RSVP right now." },
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
        eventId?: string;
        status?: string;
      }
    | null;

  const eventId = body?.eventId?.trim() ?? "";
  const status = body?.status?.trim() ?? "";

  if (!eventId || !isValidRsvpStatus(status)) {
    return NextResponse.json(
      { error: "Provide a valid event id and RSVP status." },
      { status: 400 },
    );
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle<Pick<EventRow, "id">>();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const { error: upsertError } = await supabase.from("rsvps").upsert(
    {
      event_id: event.id,
      user_id: profile.id,
      status,
    },
    {
      onConflict: "event_id,user_id",
    },
  );

  if (upsertError) {
    return NextResponse.json(
      { error: upsertError.message || "Could not update RSVP." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "RSVP updated successfully.",
  });
}
