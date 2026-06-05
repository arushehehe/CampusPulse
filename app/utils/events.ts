export const EVENT_CATEGORIES = [
  "Tech",
  "Cultural",
  "Sports",
  "Academic",
  "Social",
  "Community",
  "Merch",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_SOURCE_TYPES = ["official", "organizer", "community"] as const;

export type EventSourceType = (typeof EVENT_SOURCE_TYPES)[number];

export const EVENT_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "published",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string;
  start_time: string;
  end_time: string;
  poster_url: string | null;
  source_url?: string | null;
  source_type: EventSourceType;
  status: EventStatus;
  organizer_profile_id?: string | null;
  created_by?: string;
  is_paid?: boolean;
  price?: number | null;
  capacity?: number | null;
  star_count?: number;
  view_count?: number;
  created_at: string;
};

export type EventSearchFilters = {
  search: string;
  category: string;
  sourceType: string;
  mode: string;
  calendarView: string;
  dateFrom: string;
  dateTo: string;
  priceType: string;
};

export const RSVP_STATUSES = ["going", "interested", "not_going"] as const;

export type RsvpStatus = (typeof RSVP_STATUSES)[number];

export type RsvpCountMap = Record<RsvpStatus, number>;

export type EventRsvpRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
};

export type EventModerationActionRow = {
  id: string;
  event_id: string;
  moderator_id: string;
  from_status: EventStatus | null;
  to_status: EventStatus;
  reason: string | null;
  created_at: string;
};

export type EventStarRow = {
  id: string;
  event_id: string;
  user_id: string;
  created_at: string;
};

export type EventAttendeeRow = {
  status: RsvpStatus;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    is_attendance_public: boolean;
  } | null;
};

export const createEmptyRsvpCounts = (): RsvpCountMap => ({
  going: 0,
  interested: 0,
  not_going: 0,
});

export const getRsvpLabel = (status: RsvpStatus) => {
  switch (status) {
    case "going":
      return "Going";
    case "interested":
      return "Interested";
    case "not_going":
      return "Not Going";
    default:
      return status;
  }
};

export const formatEventDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(startDate);

  const endLabel = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  }).format(endDate);

  return `${startLabel} - ${endLabel}`;
};

export const normalizeSingleSearchParam = (
  value: string | string[] | undefined,
) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

export const formatDateTimeInputValue = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => part.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

export const EVENT_SELECT_COLUMNS =
  "id, title, description, location, category, start_time, end_time, poster_url, source_url, source_type, status, organizer_profile_id, created_by, is_paid, price, capacity, star_count, view_count, created_at";

export const CALENDAR_VIEWS = ["month", "week", "day"] as const;

export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export const isCalendarView = (value: string): value is CalendarView =>
  CALENDAR_VIEWS.includes(value as CalendarView);

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

export const getCalendarDateRange = (view: string, anchorValue?: string) => {
  const anchor = anchorValue ? new Date(`${anchorValue}T00:00:00`) : new Date();
  const validAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const start = new Date(validAnchor);
  start.setHours(0, 0, 0, 0);

  if (view === "day") {
    return {
      start,
      end: addDays(start, 1),
    };
  }

  if (view === "week") {
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = addDays(start, mondayOffset);

    return {
      start: weekStart,
      end: addDays(weekStart, 7),
    };
  }

  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);

  return {
    start: monthStart,
    end: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1),
  };
};

export const groupEventsByDay = (events: EventRow[]) => {
  const formatter = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return events.reduce<Array<{ key: string; label: string; events: EventRow[] }>>(
    (groups, event) => {
      const day = new Date(event.start_time);
      const key = day.toISOString().slice(0, 10);
      const existing = groups.find((group) => group.key === key);

      if (existing) {
        existing.events.push(event);
        return groups;
      }

      groups.push({
        key,
        label: formatter.format(day),
        events: [event],
      });

      return groups;
    },
    [],
  );
};
