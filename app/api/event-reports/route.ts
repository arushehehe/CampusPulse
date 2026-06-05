import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
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
      { error: "Only @iitg.ac.in email addresses can report events." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        eventId?: string;
        reason?: string;
        notes?: string;
      }
    | null;

  const eventId = body?.eventId?.trim() ?? "";
  const reason = body?.reason?.trim() ?? "";
  const notes = body?.notes?.trim() || null;

  if (!eventId || !reason) {
    return NextResponse.json(
      { error: "Provide an event and report reason." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("event_reports").insert({
    event_id: eventId,
    reporter_id: user.id,
    reason,
    notes,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not submit report." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Report submitted for admin review." });
}
