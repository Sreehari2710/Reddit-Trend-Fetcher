"use client";

import React, { useState, useTransition } from "react";
import { RelatedSubreddit, formatNumber, getRelativeTime } from "@/lib/utils";

export default function SubredditsPage() {
  // Related Subreddits Discovery state (independent toolbar, mirrors the posts toolbar).
  // No Sort By selector: tested both &sort=activity and &sort=new against real Reddit
  // responses and confirmed Reddit ignores them entirely, always returning the same
  // order as the default. Results are sorted by subscribers (real, verifiable data).
  const [relatedSubName, setRelatedSubName] = useState("");
  const [relatedCount, setRelatedCount] = useState("");
  const [relatedRawJson, setRelatedRawJson] = useState("");
  const [relatedSubreddits, setRelatedSubreddits] = useState<RelatedSubreddit[] | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [isParsingRelated, startRelatedTransition] = useTransition();

  // Clean and sanitize the related-subreddits search term
  const getCleanRelatedSub = () => {
    let sub = relatedSubName.trim().toLowerCase();
    if (sub.startsWith("/r/")) {
      sub = sub.substring(3);
    } else if (sub.startsWith("r/")) {
      sub = sub.substring(2);
    }
    if (sub.endsWith("/")) {
      sub = sub.substring(0, sub.length - 1);
    }
    return sub;
  };

  const cleanRelatedSub = getCleanRelatedSub();

  // Construct target Reddit subreddit-search endpoint (Listing format, same shape as posts).
  // Request one extra result: the searched subreddit itself is typically included in the
  // results and gets filtered out below, so we over-fetch by 1 to still hit the requested count.
  // No &sort= param is sent: verified against real responses that Reddit returns the exact
  // same order regardless of relevance/activity/new, so there is nothing real to select.
  const relatedTargetUrl = cleanRelatedSub && relatedCount
    ? `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(cleanRelatedSub)}&limit=${parseInt(relatedCount, 10) + 1}`
    : "";

  const handleOpenRelatedFeed = () => {
    if (!relatedSubName.trim()) {
      setRelatedError("Please enter a valid subreddit name first.");
      return;
    }
    if (!relatedCount) {
      setRelatedError("Please select a subreddit count first.");
      return;
    }
    setRelatedError(null);
    window.open(relatedTargetUrl, "_blank", "noopener,noreferrer");
  };

  // Sort already-parsed results by subscribers (real, verifiable data from every response).
  const sortRelatedSubreddits = (list: RelatedSubreddit[]): RelatedSubreddit[] => {
    const sorted = [...list];
    sorted.sort((a, b) => b.subscribers - a.subscribers);
    return sorted;
  };

  // Client-side parsing of pasted subreddits/search.json payload
  const handleParseRelated = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relatedSubName.trim()) {
      setRelatedError("Please enter a valid subreddit name first.");
      return;
    }
    if (!relatedCount) {
      setRelatedError("Please select a subreddit count first.");
      return;
    }
    if (!relatedRawJson.trim()) {
      setRelatedError("Please paste the copied Reddit search JSON payload into the text area below.");
      return;
    }
    if (relatedRawJson.length > 2 * 1024 * 1024) {
      setRelatedError("Pasted JSON is too large (maximum 2MB allowed).");
      return;
    }

    setRelatedError(null);

    startRelatedTransition(async () => {
      try {
        const rawData = JSON.parse(relatedRawJson);

        if (!rawData || rawData.kind !== "Listing" || !rawData.data || !Array.isArray(rawData.data.children)) {
          throw new Error("Invalid structure. The text doesn't look like a complete Reddit JSON Listing feed.");
        }

        const countLimit = parseInt(relatedCount, 10);

        const mapped: RelatedSubreddit[] = rawData.data.children
          .map((child: any) => {
            const data = child.data || {};
            return {
              name: data.display_name || "",
              subscribers: typeof data.subscribers === "number" ? data.subscribers : 0,
              createdAt: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : new Date().toISOString(),
              description: data.public_description || "",
              over18: !!data.over_18,
              icon: data.icon_img || data.community_icon || null,
              url: data.url ? `https://www.reddit.com${data.url}` : `https://www.reddit.com/r/${data.display_name || ""}`,
            };
          })
          .filter((entry: RelatedSubreddit) => entry.name && entry.name.toLowerCase() !== cleanRelatedSub)
          .slice(0, countLimit);

        setRelatedSubreddits(sortRelatedSubreddits(mapped));
        setRelatedError(null);
        setRelatedRawJson("");
      } catch (err: any) {
        console.error("Related subreddit JSON parsing failed:", err);
        setRelatedError(`Failed to parse JSON: ${err.message || "Please make sure you copied the entire page content (Ctrl+A) from the JSON tab."}`);
        setRelatedSubreddits(null);
      }
    });
  };

  const handleUseRelatedSubreddit = (name: string) => {
    window.location.href = `/?subreddit=${encodeURIComponent(name)}`;
  };

  return (
    <div className="pb-24">
      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Title Section */}
        <div className="mb-12 border-l-2 border-sky-500 pl-5">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 uppercase font-mono">
            Discover Related Subreddits
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl">
            Search Reddit's subreddit index by topic and browse communities sorted by subscriber count.
          </p>
        </div>

        {/* Related Subreddits Discovery Panel (fully independent toolbar + flow) */}
        <section className="mb-8 bg-slate-900/40 border border-slate-900 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-5 h-5 rounded bg-sky-500/10 text-sky-400 text-[10px] font-bold flex items-center justify-center font-mono border border-sky-500/20">+</span>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 font-mono">Subreddit Search Toolbar</h3>
          </div>

          {/* Independent toolbar: own subreddit name and count inputs (no Sort By selector
              — tested &sort=activity and &sort=new against real Reddit responses and
              confirmed both are ignored, always returning the same default order, so
              there was nothing real to offer a choice between) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end mb-6">
            {/* Subreddit Name Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="related-sub" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                Subreddit Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono">r/</span>
                <input
                  id="related-sub"
                  type="text"
                  placeholder="technology"
                  value={relatedSubName}
                  onChange={(e) => setRelatedSubName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 pl-7 pr-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            {/* Count Select */}
            <div className="flex flex-col gap-2">
              <label htmlFor="related-count" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                Subreddit Count
              </label>
              <select
                id="related-count"
                value={relatedCount}
                onChange={(e) => setRelatedCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono cursor-pointer"
              >
                <option value="" disabled>-- Select Count --</option>
                <option value="5">5 Subreddits</option>
                <option value="10">10 Subreddits</option>
                <option value="20">20 Subreddits</option>
                <option value="50">50 Subreddits</option>
                <option value="100">100 Subreddits</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Step A: Open search feed */}
            <div className="lg:col-span-2 flex flex-col justify-between">
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Open Reddit's subreddit search feed for <code className="text-slate-300 font-mono">r/{cleanRelatedSub || "subreddit"}</code>, then copy the page (<kbd className="bg-slate-950 px-1 py-0.5 rounded text-[10px] border border-slate-850">Ctrl+A</kbd>, <kbd className="bg-slate-950 px-1 py-0.5 rounded text-[10px] border border-slate-850">Ctrl+C</kbd>) and paste it below.
              </p>
              <button
                onClick={handleOpenRelatedFeed}
                className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-200 hover:text-white font-bold py-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow"
              >
                Open Related Feed
                <svg className="w-3.5 h-3.5 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>

            {/* Step B: Paste and parse */}
            <form onSubmit={handleParseRelated} className="lg:col-span-3 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Paste Search JSON</span>
                {relatedRawJson.trim() && (
                  <button
                    type="button"
                    onClick={() => setRelatedRawJson("")}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-mono uppercase tracking-wider"
                  >
                    [Clear]
                  </button>
                )}
              </div>
              <textarea
                value={relatedRawJson}
                onChange={(e) => setRelatedRawJson(e.target.value)}
                placeholder="Paste JSON Listing (starts with { 'kind': 'Listing' ... })"
                className="w-full min-h-[70px] bg-slate-950 border border-slate-850 rounded-lg p-3 text-[11px] text-slate-300 focus:outline-none focus:border-slate-700 transition-all font-mono resize-none placeholder-slate-700"
              />
              <button
                type="submit"
                disabled={isParsingRelated}
                className="w-full bg-slate-100 hover:bg-white text-slate-950 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow"
              >
                {isParsingRelated ? "Processing..." : "Find Related Subreddits"}
              </button>
            </form>
          </div>

          {relatedError && (
            <div className="animate-fade-in mt-5 bg-red-950/20 border border-red-900/60 rounded-xl p-4 flex gap-3 text-red-300 font-mono">
              <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-xs">
                <h4 className="font-bold uppercase tracking-wider text-red-400">Error Triggered</h4>
                <p className="mt-1 text-red-300/80">{relatedError}</p>
              </div>
            </div>
          )}

          {relatedSubreddits && (
            <div className="animate-slide-up mt-5 pt-5 border-t border-slate-900">
              {relatedSubreddits.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No related subreddits found for r/{cleanRelatedSub}.</p>
              ) : (
                <>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-3">Sorted by Subscribers</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relatedSubreddits.map((sub) => (
                      <div
                        key={sub.name}
                        className="group bg-slate-950 border border-slate-850 hover:border-sky-700/60 rounded-lg p-4 transition-all flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {sub.icon ? (
                              <img src={sub.icon} alt="" className="w-7 h-7 rounded-full bg-slate-900 flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-850 flex-shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400 font-mono truncate" title={`r/${sub.name}`}>
                              r/{sub.name}
                            </span>
                          </div>
                          {sub.over18 && (
                            <span className="text-[9px] font-bold text-red-400 border border-red-900/60 rounded px-1 font-mono flex-shrink-0">18+</span>
                          )}
                        </div>

                        {sub.description && (
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 font-sans">
                            {sub.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                          <span>{formatNumber(sub.subscribers)} members</span>
                          <span className="w-1 h-1 rounded-full bg-slate-800" />
                          <span>Created {getRelativeTime(sub.createdAt)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleUseRelatedSubreddit(sub.name)}
                            className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-sky-700/60 text-slate-300 hover:text-sky-400 font-bold py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all"
                          >
                            Use This
                          </button>
                          <a
                            href={sub.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-850 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-all"
                          >
                            Open
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
