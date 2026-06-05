import type { EventRow } from "@/app/utils/events";

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

const formatIcsDate = (value: string) =>
  new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

export const buildEventIcs = (event: EventRow, origin: string) => {
  const eventUrl = `${origin}/events/${event.id}`;
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusPulse//Campus Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@campuspulse`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(event.start_time)}`,
    `DTEND:${formatIcsDate(event.end_time)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    `URL:${eventUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
};

export const buildCalendarIcs = (events: EventRow[], origin: string) => {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusPulse//Campus Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CampusPulse IIT Guwahati",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.id}@campuspulse`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(event.start_time)}`,
      `DTEND:${formatIcsDate(event.end_time)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
      event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
      `URL:${origin}/events/${event.id}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
};
