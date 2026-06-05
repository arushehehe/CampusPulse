import Link from "next/link";
import { Button } from "../ui/Button";

export function Navbar({ user }: { user: any }) {
  return (
    <header className="sticky top-0 z-50 w-full glass border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="editorial-heading text-2xl tracking-tighter">
            CampusPulse.
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/events" className="text-sm font-medium hover:underline underline-offset-4 decoration-2">
            Feed
          </Link>
          {user ? (
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm">Sign out</Button>
            </form>
          ) : (
            <Link href="/login">
              <Button variant="editorial">Sign In</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
