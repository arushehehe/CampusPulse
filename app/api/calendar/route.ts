import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { buildCalendarIcs } from "@/app/utils/calendar";
import { EVENT_SELECT_COLUMNS, type EventRow } from "@/app/utils/events";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(request: Request) {
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
      { error: "Only @iitg.ac.in email addresses can export the campus calendar." },
      { status: 403 },
    );
  }

  const { data: events, error } = await supabase
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("status", "published")
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(500)
    .returns<EventRow[]>();

  if (error) {
    return NextResponse.json({ error: "Published events could not be loaded." }, { status: 400 });
  }

  const ics = buildCalendarIcs(events ?? [], new URL(request.url).origin);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="campuspulse-calendar.ics"',
    },
  });
}
