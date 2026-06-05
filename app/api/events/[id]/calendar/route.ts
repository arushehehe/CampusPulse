import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { buildEventIcs } from "@/app/utils/calendar";
import { EVENT_SELECT_COLUMNS, type EventRow } from "@/app/utils/events";
import { createClient } from "@/app/utils/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
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
      { error: "Only @iitg.ac.in email addresses can export events." },
      { status: 403 },
    );
  }

  const { data: event, error } = await supabase
    .from("events")
    .select(EVENT_SELECT_COLUMNS)
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle<EventRow>();

  if (error || !event) {
    return NextResponse.json({ error: "Published event not found." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const ics = buildEventIcs(event, origin);

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="campuspulse-${event.id}.ics"`,
    },
  });
}
