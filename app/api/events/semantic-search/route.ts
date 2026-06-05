import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { createClient } from "@/app/utils/supabase/server";

const EMBEDDING_DIMENSIONS = 1536;

const isEmbedding = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === EMBEDDING_DIMENSIONS &&
  value.every((item) => typeof item === "number" && Number.isFinite(item));

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
      { error: "Only @iitg.ac.in email addresses can search events." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        embedding?: unknown;
        matchCount?: number;
        minSimilarity?: number;
      }
    | null;

  if (!isEmbedding(body?.embedding)) {
    return NextResponse.json(
      { error: "Provide a 1536-dimension query embedding." },
      { status: 400 },
    );
  }

  const { data: events, error } = await supabase.rpc("match_events", {
    query_embedding: body.embedding,
    match_count: Math.min(Math.max(body.matchCount ?? 12, 1), 50),
    min_similarity: body.minSimilarity ?? 0.72,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Semantic search failed." },
      { status: 400 },
    );
  }

  return NextResponse.json({ events: events ?? [] });
}
