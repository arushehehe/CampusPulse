import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { createClient } from "@/app/utils/supabase/server";

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
      { error: "Only @iitg.ac.in email addresses can update profile privacy." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        isAttendancePublic?: boolean;
      }
    | null;

  if (typeof body?.isAttendancePublic !== "boolean") {
    return NextResponse.json({ error: "Provide a valid privacy value." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_attendance_public: body.isAttendancePublic })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update profile privacy." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Profile privacy updated." });
}
