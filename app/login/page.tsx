import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { createClient } from "@/app/utils/supabase/server";
import { Navbar } from "@/components/layout/Navbar";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/events");
  }

  return (
    <div className="min-h-screen bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] bg-[var(--background)]">
      <Navbar user={user} />
      
      <main className="container mx-auto px-6 py-16 animate-fade-in-up">
        <div className="mx-auto grid w-full max-w-5xl gap-16 lg:grid-cols-[1fr_1fr] lg:items-center">
          
          <section className="space-y-8 editorial-border border-b-0">
            <Link href="/" className="inline-block border border-[var(--foreground)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]">
              ← Return to Front Page
            </Link>
            
            <div className="space-y-6 pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
                Exclusive IITG Access
              </p>
              <h1 className="editorial-heading text-5xl sm:text-6xl leading-[1.1]">
                Enter the Pulse.
              </h1>
              <div className="h-1 w-16 bg-[var(--accent-red)]"></div>
              <p className="max-w-xl text-lg font-medium leading-relaxed text-[var(--ink-800)] dark:text-gray-300">
                Secure access is restricted exclusively to verified members of the IIT Guwahati community. Sign in to unlock event discovery, personal RSVPs, and calendar curation.
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 pt-6 border-t border-[var(--border-color)]">
              <div className="border-l-4 border-[var(--foreground)] pl-4">
                <p className="font-serif font-bold text-lg text-[var(--foreground)]">One Calendar</p>
                <p className="mt-1 text-sm text-[var(--ink-800)] dark:text-gray-300">
                  Every campus event curated in a single definitive feed.
                </p>
              </div>
              <div className="border-l-4 border-[var(--accent-blue)] pl-4">
                <p className="font-serif font-bold text-lg text-[var(--foreground)]">Your Roster</p>
                <p className="mt-1 text-sm text-[var(--ink-800)] dark:text-gray-300">
                  RSVP to events and track your schedule seamlessly.
                </p>
              </div>
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-4 bg-[var(--accent-blue)] opacity-5 blur-2xl"></div>
            <MagicLinkForm />
          </section>
          
        </div>
      </main>
    </div>
  );
}
