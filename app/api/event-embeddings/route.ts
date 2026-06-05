import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";

const EMBEDDING_DIMENSIONS = 1536;

const isEmbedding = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === EMBEDDING_DIMENSIONS &&
  value.every((item) => typeof item === "number" && Number.isFinite(item));

const getAdminProfile = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
) => {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle<Pick<UserProfile, "id" | "role">>();

  return profile?.role === "admin" ? profile : null;
};

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
      { error: "Only @iitg.ac.in email addresses can write event embeddings." },
      { status: 403 },
    );
  }

  const profile = await getAdminProfile(supabase, user.id);

  if (!profile) {
    return NextResponse.json(
      { error: "Only admins can write event embeddings." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        eventId?: string;
        embedding?: unknown;
        contentHash?: string;
        jobId?: string;
      }
    | null;

  const eventId = body?.eventId?.trim() ?? "";
  const contentHash = body?.contentHash?.trim() ?? "";
  const jobId = body?.jobId?.trim() ?? "";

  if (!eventId || !contentHash || !isEmbedding(body?.embedding)) {
    return NextResponse.json(
      { error: "Provide an event id, content hash, and 1536-dimension embedding." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("event_embeddings").upsert(
    {
      event_id: eventId,
      embedding: body.embedding,
      content_hash: contentHash,
      embedded_at: new Date().toISOString(),
    },
    {
      onConflict: "event_id",
    },
  );

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not save event embedding." },
      { status: 400 },
    );
  }

  if (jobId) {
    await supabase
      .from("embedding_jobs")
      .update({
        status: "completed",
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  return NextResponse.json({ message: "Event embedding saved." });
}
