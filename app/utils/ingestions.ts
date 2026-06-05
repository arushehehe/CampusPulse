export const EVENT_INGESTION_SOURCE_TYPES = [
  "link",
  "poster",
  "link_and_poster",
  "notes",
] as const;

export type EventIngestionSourceType =
  (typeof EVENT_INGESTION_SOURCE_TYPES)[number];

export const EVENT_INGESTION_STATUSES = [
  "pending",
  "processing",
  "extracted",
  "failed",
  "dismissed",
] as const;

export type EventIngestionStatus = (typeof EVENT_INGESTION_STATUSES)[number];

export type EventIngestionRow = {
  id: string;
  source_type: EventIngestionSourceType;
  source_url: string | null;
  poster_url: string | null;
  notes: string | null;
  extraction_status: EventIngestionStatus;
  extraction_error: string | null;
  extracted_event_id: string | null;
  submitted_by: string;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

export const getIngestionSourceType = (
  sourceUrl: string | null,
  posterUrl: string | null,
): EventIngestionSourceType => {
  if (sourceUrl && posterUrl) {
    return "link_and_poster";
  }

  if (sourceUrl) {
    return "link";
  }

  if (posterUrl) {
    return "poster";
  }

  return "notes";
};
