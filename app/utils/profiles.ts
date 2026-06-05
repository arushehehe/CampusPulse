import type { User } from "@supabase/supabase-js";

export const USER_ROLES = ["student", "organizer", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_attendance_public: boolean;
  created_at?: string;
};

const getUserMetadataValue = (
  user: User,
  key: "full_name" | "name" | "avatar_url",
) => {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? value : null;
};

export const deriveProfilePayload = (user: User) => ({
  id: user.id,
  email: user.email ?? "",
  full_name:
    getUserMetadataValue(user, "full_name") ?? getUserMetadataValue(user, "name"),
  avatar_url: getUserMetadataValue(user, "avatar_url"),
  role: "student" as UserRole,
  is_attendance_public: false,
});

export const ROLE_DETAILS: Record<
  UserRole,
  { label: string; summary: string; accent: string }
> = {
  student: {
    label: "Student",
    summary: "Discover events, RSVP, and submit community activity.",
    accent: "bg-sky-100 text-sky-800",
  },
  organizer: {
    label: "Organizer",
    summary: "Create and manage events for clubs, societies, or teams.",
    accent: "bg-amber-100 text-amber-800",
  },
  admin: {
    label: "Admin",
    summary: "Moderate submissions, verify organizers, and keep the feed healthy.",
    accent: "bg-emerald-100 text-emerald-800",
  },
};

export const isPrivilegedRole = (role: UserRole) =>
  role === "organizer" || role === "admin";
