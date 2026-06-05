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
      { error: "Only @iitg.ac.in email addresses can follow organizers." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        organizerId?: string;
        following?: boolean;
      }
    | null;

  const organizerId = body?.organizerId?.trim() ?? "";

  if (!organizerId || organizerId === user.id) {
    return NextResponse.json({ error: "Provide a valid organizer id." }, { status: 400 });
  }

  if (body?.following === false) {
    const { error } = await supabase
      .from("organizer_follows")
      .delete()
      .eq("organizer_profile_id", organizerId)
      .eq("follower_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Could not unfollow this organizer." },
        { status: 400 },
      );
    }

    return NextResponse.json({ message: "Organizer unfollowed." });
  }

  const { error } = await supabase.from("organizer_follows").upsert(
    {
      organizer_profile_id: organizerId,
      follower_id: user.id,
    },
    {
      onConflict: "organizer_profile_id,follower_id",
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not follow this organizer." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Organizer followed." });
}
