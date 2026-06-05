import { type EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getSafeNextPath, isAllowedCollegeEmail } from "@/app/utils/auth";
import { deriveProfilePayload } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const nextPath = getSafeNextPath(requestUrl.searchParams.get("next"));
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", request.url),
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      return NextResponse.redirect(
        new URL("/login?error=auth_callback_failed", request.url),
      );
    }
  } else {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", request.url),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=auth_callback_failed", request.url),
    );
  }

  if (!isAllowedCollegeEmail(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL("/login?error=unauthorized_domain", request.url),
    );
  }

  const { data: existingProfile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileLookupError) {
    return NextResponse.redirect(
      new URL("/login?error=profile_setup_failed", request.url),
    );
  }

  if (!existingProfile) {
    const { error: profileInsertError } = await supabase
      .from("profiles")
      .insert(deriveProfilePayload(user));

    if (profileInsertError) {
      return NextResponse.redirect(
        new URL("/login?error=profile_setup_failed", request.url),
      );
    }
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
