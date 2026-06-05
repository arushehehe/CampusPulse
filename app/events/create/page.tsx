import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { isAllowedCollegeEmail } from "@/app/utils/auth";
import { ROLE_DETAILS, isPrivilegedRole, type UserProfile } from "@/app/utils/profiles";
import { createClient } from "@/app/utils/supabase/server";
import { CreateEventForm } from "@/components/events/create-event-form";
import { EventIngestionForm } from "@/components/events/event-ingestion-form";

export default async function CreateEventPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAllowedCollegeEmail(user.email)) {
    redirect("/login?error=unauthorized_domain");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<UserProfile>();

  const role = profile?.role ?? "student";
  const roleDetail = ROLE_DETAILS[role];
  const canCreateEvents = isPrivilegedRole(role);

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-[var(--background)] pb-20">
      <Navbar user={user} />
      
      <main className="container mx-auto px-6 py-10 animate-fade-in-up max-w-4xl">
        <header className="editorial-border mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/events"
              className="inline-block border border-[var(--foreground)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] mb-6"
            >
              ← Return to Feed
            </Link>
            <h1 className="editorial-heading text-4xl sm:text-5xl">
              Publish an Event.
            </h1>
            <p className="mt-4 text-lg font-medium text-[var(--ink-800)] dark:text-gray-300">
              Submit your campus events to the official calendar.
            </p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="glass-card p-8 border-t-8 border-[var(--foreground)]">
            <h2 className="editorial-heading text-2xl mb-6">Direct Submission</h2>
            <CreateEventForm
              roleLabel={roleDetail.label}
              canPublishDirectly={canCreateEvents}
            />
          </div>
          
          <div className="glass-card p-8 border-t-8 border-[var(--accent-blue)]">
            <h2 className="editorial-heading text-2xl mb-6">Automated Intake</h2>
            <p className="text-sm font-medium text-[var(--ink-800)] dark:text-gray-300 mb-6 border-l-2 border-[var(--accent-blue)] pl-3">
              Drop a poster or a link, and our pipeline will extract the details for review.
            </p>
            <EventIngestionForm />
          </div>
        </div>
      </main>
    </div>
  );
}
