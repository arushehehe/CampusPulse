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
      { error: "Only @iitg.ac.in email addresses can enable push notifications." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        endpoint?: string;
        keys?: {
          p256dh?: string;
          auth?: string;
        };
      }
    | null;

  const endpoint = body?.endpoint?.trim() ?? "";
  const p256dh = body?.keys?.p256dh?.trim() ?? "";
  const auth = body?.keys?.auth?.trim() ?? "";

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "Provide a valid browser push subscription." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    },
    {
      onConflict: "endpoint",
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not save push subscription." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Push subscription saved." });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        endpoint?: string;
      }
    | null;

  const endpoint = body?.endpoint?.trim() ?? "";

  if (!endpoint) {
    return NextResponse.json({ error: "Provide an endpoint." }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not remove push subscription." },
      { status: 400 },
    );
  }

  return NextResponse.json({ message: "Push subscription removed." });
}
