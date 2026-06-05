"use client";

import { createClient } from "@/app/utils/supabase/client";

const POSTER_BUCKET = "event-posters";
const MAX_POSTER_SIZE_BYTES = 5 * 1024 * 1024;

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const uploadEventPoster = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Poster must be an image file.");
  }

  if (file.size > MAX_POSTER_SIZE_BYTES) {
    throw new Error("Poster image must be 5 MB or smaller.");
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sign in again before uploading a poster.");
  }

  const safeName = sanitizeFileName(file.name) || "poster";
  const filePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(POSTER_BUCKET).upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || "Could not upload poster.");
  }

  const { data } = supabase.storage.from(POSTER_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
};
