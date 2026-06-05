"use client";

import { useState } from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";

export function FeedLayout({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="container mx-auto px-6 py-10 animate-fade-in-up max-w-[1400px]">
      
      {/* Layout Toolbar */}
      <div className="mb-8 flex justify-end">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="flex items-center gap-2 border border-[var(--foreground)] bg-transparent px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]"
          aria-label={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        >
          {isSidebarOpen ? (
            <>
              <PanelLeftCloseIcon className="h-4 w-4" />
              Focus Mode
            </>
          ) : (
            <>
              <PanelLeftOpenIcon className="h-4 w-4" />
              Show Dashboard
            </>
          )}
        </button>
      </div>

      <div className={`grid gap-12 items-start transition-all duration-500 ${isSidebarOpen ? "lg:grid-cols-[320px_1fr]" : "grid-cols-1"}`}>
        
        {/* Left Sidebar */}
        {isSidebarOpen && (
          <aside className="sticky top-24 flex flex-col gap-8 animate-fade-in-up">
            {sidebar}
          </aside>
        )}

        {/* Main Feed */}
        <div className={`flex flex-col gap-10 ${!isSidebarOpen ? "mx-auto w-full max-w-4xl" : ""}`}>
          {children}
        </div>
        
      </div>
    </div>
  );
}
