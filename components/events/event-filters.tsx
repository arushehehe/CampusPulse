import Link from "next/link";
import { CALENDAR_VIEWS, EVENT_CATEGORIES } from "@/app/utils/events";

type Props = {
  search: string;
  category: string;
  sourceType: string;
  mode: string;
  calendarView: string;
  dateFrom: string;
  dateTo: string;
  priceType: string;
};

const sourceOptions = [
  { value: "", label: "All sources" },
  { value: "official", label: "Official" },
  { value: "organizer", label: "Organizer" },
  { value: "community", label: "Community" },
];

export function EventFilters({
  search,
  category,
  sourceType,
  mode,
  calendarView,
  dateFrom,
  dateTo,
  priceType,
}: Props) {
  return (
    <section className="border-t-8 border-t-[var(--accent-red)] pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-700)] dark:text-gray-400">
            Explore
          </p>
          <h2 className="editorial-heading mt-2 text-2xl">
            Search & Filter
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-800)] dark:text-gray-300">
            Switch between list, calendar, trending, and your followed organizers.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b-2 border-[var(--foreground)] pb-4">
        {[
          { value: "calendar", label: "Calendar" },
          { value: "list", label: "List" },
          { value: "trending", label: "Trending" },
          { value: "following", label: "Following" },
        ].map((option) => (
          <Link
            key={option.value}
            href={{
              pathname: "/events",
              query: {
                ...(search ? { search } : {}),
                ...(category ? { category } : {}),
                ...(sourceType ? { source: sourceType } : {}),
                ...(calendarView ? { calendarView } : {}),
                ...(dateFrom ? { dateFrom } : {}),
                ...(dateTo ? { dateTo } : {}),
                ...(priceType ? { price: priceType } : {}),
                mode: option.value,
              },
            }}
            className={
              mode === option.value
                ? "bg-[var(--foreground)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--background)] transition-colors"
                : "border border-[var(--foreground)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]"
            }
          >
            {option.label}
          </Link>
        ))}
      </div>

      <form className="mt-6 flex flex-col gap-6">
        <input type="hidden" name="mode" value={mode} />
        
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Search</span>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Hackathon, run, merch, club..."
            className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Category</span>
            <select
              name="category"
              defaultValue={category}
              className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            >
              <option value="">All categories</option>
              {EVENT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Source</span>
            <select
              name="source"
              defaultValue={sourceType}
              className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            >
              {sourceOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">Price</span>
            <select
              name="price"
              defaultValue={priceType}
              className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            >
              <option value="">Free & Paid</option>
              <option value="free">Free only</option>
              <option value="paid">Paid only</option>
            </select>
          </label>

          {mode === "calendar" && (
            <label className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">View</span>
              <select
                name="calendarView"
                defaultValue={calendarView}
                className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
              >
                {CALENDAR_VIEWS.map((view) => (
                  <option key={view} value={view}>
                    {view.slice(0, 1).toUpperCase()}
                    {view.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">From</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--ink-700)] dark:text-gray-400">To</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="w-full border-2 border-[var(--foreground)] bg-transparent px-4 py-3 text-sm font-medium text-[var(--foreground)] outline-none transition-colors focus:border-[var(--accent-blue)]"
            />
          </label>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <button
            type="submit"
            className="flex-1 bg-[var(--foreground)] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[var(--background)] transition-transform hover:-translate-y-1"
          >
            Apply Filters
          </button>
          <Link
            href="/events"
            className="flex-1 border-2 border-[var(--foreground)] bg-transparent px-5 py-3 text-center text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]"
          >
            Reset
          </Link>
        </div>
      </form>
    </section>
  );
}
