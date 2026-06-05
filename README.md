# CampusPulse

CampusPulse is a Next.js + Supabase campus event hub for IIT Guwahati. The current build focuses on the core loop: restricted magic-link auth, role-aware profiles, event discovery, event submission, admin moderation, and RSVP state.

## Current Scope

- Supabase magic-link authentication restricted to `@iitg.ac.in`
- First-login profile creation with default `student` role
- Manual promotion path for `organizer` and `admin` roles in Supabase
- Published event feed with full-text search, category, source, date, and free/paid filters
- Student community event submissions routed to moderation
- Organizer/admin direct event publishing
- Admin moderation queue for pending submissions
- Event poster uploads through Supabase Storage
- Event editing for admins, organizer-owned events, and unapproved community submissions
- Organizer profile pages with published event lists
- Per-event `.ics` calendar export links
- Moderation audit history with rejection reasons
- RSVP actions with `going`, `interested`, and `not_going` counts
- Raw event-source intake for links, posters, and notes before LLM extraction
- List, month/week/day calendar, and trending feed modes
- Community event stars with auto-publish at 25 stars
- Attendee visibility controlled by each user's privacy setting
- Organizer follow/unfollow actions with follower counts
- Paid/free metadata with optional price and capacity
- Full campus iCal export at `/api/calendar`
- Admin extraction form that turns raw ingestion rows into pending event drafts
- View counts for published event detail pages
- Organizer/admin engagement dashboard at `/organizer-dashboard`
- In-app notifications for newly published events from followed organizers
- Event reports that flow into admin moderation
- Admin APIs for scraping source registration and raw scrape intake
- pgvector event embeddings with embedding job queue and semantic-search RPC
- Supabase cron queue for six-hour scraping jobs
- Database-ready push subscriptions, event series, scraping sources, and scraped raw rows
- Editorial/scrapbook themed UI with focus-mode toggles and highly animated modern typography
- Dedicated profile management page for privacy settings and starred events
- Headless background worker scripts (`workers/`) for autonomous LLM extraction and embedding generation

## Tech Stack

- Next.js App Router, TypeScript, React
- Tailwind CSS
- Supabase Auth, Postgres, and Row Level Security

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

3. Run `supabase/schema.sql` in the Supabase SQL editor.

4. Start the app:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Role Model

- `student`: can view events, RSVP, and submit community events for review
- `organizer`: can publish organizer events directly
- `admin`: can publish official events and moderate pending submissions

Profiles are created as `student` on first login. Promote users manually in Supabase until an admin user-management UI exists.

## Important Routes

- `/login`: magic-link sign in
- `/profile`: user profile management, privacy settings, and starred events
- `/events`: authenticated event feed, filters, submission form, RSVPs
- `/events/[id]`: event details, RSVP controls, and authorized editing
- `/moderation`: admin-only pending submission queue
- `/notifications`: in-app notification inbox
- `/organizer-dashboard`: organizer/admin event analytics
- `/organizers/[id]`: public-to-campus organizer profile and published events
- `/api/events/[id]/calendar`: authenticated `.ics` download for published events
- `/api/calendar`: authenticated `.ics` feed for all upcoming published events
- `/api/event-reports`: submit a content report for an event
- `/api/event-reports/review`: admin review/dismiss report actions
- `/api/embedding-jobs`: admin queue endpoint for embedding workers
- `/api/event-embeddings`: admin endpoint for writing event embeddings
- `/api/events/semantic-search`: semantic event search from a query embedding
- `/api/push-subscriptions`: store/remove browser push subscription endpoints
- `/api/scraping-jobs`: admin queue endpoint for scraper workers
- `/api/scraping-sources`: admin source registry for scheduled scrapers
- `/api/scraping-runs`: admin raw scrape intake endpoint

## Database

The schema in `supabase/schema.sql` defines:

- `profiles`
- `colleges`
- `events`
- `event_series`
- `rsvps`
- `event_moderation_actions`
- `event_ingestions`
- `event_embeddings`
- `embedding_jobs`
- `event_stars`
- `organizer_follows`
- `event_reports`
- `notifications`
- `push_subscriptions`
- `scraping_sources`
- `scraping_jobs`
- `scraped_raw`
- public `event-posters` storage bucket

RLS is intentionally conservative: users can insert their own profile, students can submit and edit unapproved community events, organizers/admins can maintain owned events, only admins can update moderation status, and moderation history is visible to admins plus event submitters.
Raw event-source intake records are visible to their submitter plus admins, and only admins can update extraction review status.
Stars, follows, and attendee visibility are authenticated-campus-only flows. Community events auto-publish after 25 stars.
Published event view counts are incremented through a narrow `increment_event_view_count` database function instead of broadening event update policies.

See `docs/database-schema.md` for a short schema guide and `docs/llm-prompts.md` for the planned extraction prompt.

## Provider-Backed Features

- **LLM vision extraction**: The `workers/intake-worker.ts` script is set up to poll `event_ingestions`. Add an OpenAI API key to `.env.local` to autonomously write structured drafts through Supabase.
- **Automated scraping**: Supabase cron now enqueues due `scraping_jobs` every 6 hours. A scraper worker should read `/api/scraping-jobs`, write raw rows through `/api/scraping-runs`, and mark jobs complete or failed.
- **Push notifications**: use `push_subscriptions` with a web-push worker and VAPID keys. In-app notifications are already stored in `notifications`.
- **Semantic search and deduplication**: pgvector tables/RPCs are in place. The `workers/embedding-worker.ts` script securely polls jobs and generates 1536-dimensional embeddings. Add your API key to activate semantic search.
- **Deployment**: configure Supabase environment variables on Vercel and apply `supabase/schema.sql` before first production login.
