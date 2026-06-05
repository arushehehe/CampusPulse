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
      { error: "Only @iitg.ac.in email addresses can star events." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        eventId?: string;
        starred?: boolean;
      }
    | null;

  const eventId = body?.eventId?.trim() ?? "";

  if (!eventId) {
    return NextResponse.json({ error: "Provide a valid event id." }, { status: 400 });
  }

  if (body?.starred === false) {
    const { error } = await supabase
      .from("event_stars")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not remove the star." },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Star removed." });
  }

  const { error } = await supabase.from("event_stars").upsert(
    {
      event_id: eventId,
      user_id: user.id,
    },
    {
      onConflict: "event_id,user_id",
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not star the event." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Event starred." });
}
