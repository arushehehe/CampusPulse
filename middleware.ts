import { NextResponse, type NextRequest } from "next/server";
import { getSafeNextPath, isAllowedCollegeEmail } from "@/app/utils/auth";
import { updateSession } from "@/app/utils/supabase/middleware";

const protectedPrefixes = ["/events", "/moderation", "/organizers"];
const guestOnlyPrefixes = ["/login"];

const matchesPrefix = (pathname: string, prefixes: string[]) =>
  prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const redirectWithCookies = (url: URL, response: NextResponse) => {
  const redirectResponse = NextResponse.redirect(url);

  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
};

export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (user && !isAllowedCollegeEmail(user.email)) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("error", "unauthorized_domain");
    return redirectWithCookies(redirectUrl, response);
  }

  if (!user && matchesPrefix(pathname, protectedPrefixes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", getSafeNextPath(`${pathname}${search}`));
    return redirectWithCookies(redirectUrl, response);
  }

  if (user && matchesPrefix(pathname, guestOnlyPrefixes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/events";
    redirectUrl.search = "";
    return redirectWithCookies(redirectUrl, response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
