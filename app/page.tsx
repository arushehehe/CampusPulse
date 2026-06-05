import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/app/utils/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";

export default async function Home() {
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
      
      <main className="container mx-auto px-6 py-12 lg:py-24 animate-fade-in-up">
        {/* Newspaper Masthead Style Hero */}
        <div className="editorial-border mb-16 flex flex-col items-center justify-center text-center space-y-6">
          <div className="inline-block border border-[var(--foreground)] bg-[var(--background)] px-4 py-1 text-xs font-bold uppercase tracking-[0.2em]">
            Vol. 1 — The Daily Pulse
          </div>
          
          <h1 className="editorial-heading max-w-4xl text-6xl leading-[1.1] sm:text-7xl lg:text-8xl">
            THE CAMPUS EVENT <br />
            <span className="italic text-[var(--accent-red)] relative inline-block">
              CHRONICLE
              <span className="absolute -bottom-2 left-0 w-full border-b-4 border-[var(--accent-red)] transform -rotate-1"></span>
            </span>
          </h1>
          
          <p className="max-w-2xl text-lg font-medium leading-relaxed text-[var(--ink-700)] dark:text-gray-300 mt-6">
            IITG students can sign in, discover live events, RSVP, submit
            community activity, follow organizers, and export campus calendars
            from one definitive source.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link href="/login">
              <Button size="lg" className="uppercase tracking-wider font-bold">
                Read the feed →
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="uppercase tracking-wider font-bold shadow-[4px_4px_0px_var(--foreground)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                Submit an event
              </Button>
            </Link>
          </div>
        </div>

        {/* Bento Grid Features (Scrapbook feel) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1 */}
          <section className="glass-card group p-8 hover-lift relative overflow-hidden bg-white dark:bg-[#1a1a1a]">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--accent-blue)] opacity-10 transition-transform duration-500 group-hover:scale-150"></div>
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Section I</span>
            <h2 className="editorial-heading mt-4 text-3xl">Exclusive Authentication.</h2>
            <div className="mt-4 h-1 w-12 bg-[var(--foreground)]"></div>
            <p className="mt-4 text-[var(--ink-800)] dark:text-gray-300">
              Supabase magic link with strict IITG domain restriction. Protected routes keep the riff-raff out.
            </p>
          </section>

          {/* Card 2 */}
          <section className="glass-card group p-8 hover-lift relative overflow-hidden bg-[var(--foreground)] text-[var(--background)]">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Section II</span>
            <h2 className="editorial-heading mt-4 text-3xl text-white">Event Domain.</h2>
            <div className="mt-4 h-1 w-12 bg-[var(--accent-red)]"></div>
            <p className="mt-4 text-gray-300">
              Organizer roles, real-time submissions, dynamic editing, RSVPs, stars, and powerful following mechanisms.
            </p>
            <div className="absolute bottom-0 right-0 p-4 font-serif text-8xl opacity-10">2</div>
          </section>

          {/* Card 3 */}
          <section className="glass-card group p-8 hover-lift relative overflow-hidden bg-white dark:bg-[#1a1a1a] md:col-span-2 lg:col-span-1">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Section III</span>
            <h2 className="editorial-heading mt-4 text-3xl">Intelligent Pipelines.</h2>
            <div className="mt-4 h-1 w-12 bg-[var(--foreground)]"></div>
            <p className="mt-4 text-[var(--ink-800)] dark:text-gray-300">
              Raw links, high-res posters, submitter notes, admin extraction tools, and a complete audit history for ultimate transparency.
            </p>
          </section>
        </div>
        
        <footer className="mt-24 border-t-2 border-dashed border-[var(--foreground)] py-8 text-center">
          <p className="font-serif italic text-[var(--ink-700)] dark:text-gray-400">
            Printed digitally in 2026. CampusPulse. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
