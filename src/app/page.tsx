"use client";

import React, { useState, useTransition } from "react";

// Post schema matching the PRD
interface Post {
  id: string;
  title: string;
  author: string;
  upvotes: number;
  comments: number;
  posted_at: string;
  thumbnail: string | null;
  url: string;
  nsfw: boolean;
  selftext?: string;
}

// Helpers for metric abbreviations
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}

// Helper to convert ISO dates into user-friendly relative duration strings
function getRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  } catch (e) {
    return "some time ago";
  }
}

// Helper to clean HTML-encoded characters in Reddit URLs
function cleanRedditUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return null;
  return url.replace(/&amp;/g, "&");
}

// Helper to render basic markdown bold & bullet lists in UI
function renderMarkdown(text: string) {
  if (!text) return null;
  
  const lines = text.split("\n");
  
  return lines.map((line, index) => {
    let trimmed = line.trim();
    if (!trimmed) {
      return <div key={index} className="h-2" />;
    }
    
    // Check if it's a bullet point
    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("• ");
    if (isBullet) {
      trimmed = trimmed.substring(2).trim();
    }
    
    // Parse bold segments (**bold**)
    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    const content = parts.map((part, partIndex) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={partIndex} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    
    if (isBullet) {
      return (
        <div key={index} className="flex gap-2 pl-2 my-1 items-start text-xs text-slate-300 font-sans">
          <span className="text-orange-500">•</span>
          <span>{content}</span>
        </div>
      );
    }
    
    return (
      <p key={index} className="my-1 text-xs text-slate-350 font-sans leading-relaxed">
        {content}
      </p>
    );
  });
}

export default function Dashboard() {
  // Input parameters
  const [subreddit, setSubreddit] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [sort, setSort] = useState("");
  const [limit, setLimit] = useState("");

  // Raw pasted JSON text
  const [rawJson, setRawJson] = useState("");

  // Cleaned post data & state hooks
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [totalPosts, setTotalPosts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Track revealed NSFW blurred thumbnails
  const [revealedNsfw, setRevealedNsfw] = useState<Record<string, boolean>>({});

  const toggleNsfwReveal = (id: string) => {
    setRevealedNsfw((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // AI Paraphraser state
  const [aiPostLink, setAiPostLink] = useState("");
  const [additionalIdea, setAdditionalIdea] = useState("");
  const [generatedPost, setGeneratedPost] = useState<{ title: string; body: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [matchedPost, setMatchedPost] = useState<Post | null>(null);

  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Helper to match post from link
  const findMatchedPost = (urlOrLink: string, currentPosts: Post[] | null): Post | null => {
    if (!currentPosts || !urlOrLink.trim()) return null;
    const cleanUrl = urlOrLink.trim().toLowerCase();
    
    return currentPosts.find((post) => {
      const postUrl = post.url.toLowerCase();
      // Match by exact URL, relative permalink, or check if the post ID is in the URL
      return (
        postUrl === cleanUrl ||
        postUrl.includes(cleanUrl) ||
        cleanUrl.includes(postUrl) ||
        cleanUrl.includes(post.id.toLowerCase())
      );
    }) || null;
  };

  const handleLinkChange = (linkValue: string) => {
    setAiPostLink(linkValue);
    const matched = findMatchedPost(linkValue, posts);
    setMatchedPost(matched);
    if (matched) {
      setAiError(null);
    }
  };

  const handleSelectPostForParaphrase = (post: Post) => {
    setAiPostLink(post.url);
    setMatchedPost(post);
    setAiError(null);
    
    // Scroll the AI workspace into view
    const aiSection = document.getElementById("ai-workspace");
    if (aiSection) {
      aiSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleGenerateParaphrase = async (e: React.FormEvent, isRefinement = false) => {
    e.preventDefault();
    if (!matchedPost) {
      setAiError("Please select/paste a valid post link from the fetched posts first.");
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    if (!isRefinement) {
      setGeneratedPost(null);
    }

    const payload: any = {
      postTitle: matchedPost.title,
      postSelftext: matchedPost.selftext || "",
      subreddit: subreddit || getCleanSubreddit() || "general",
      additionalIdea: additionalIdea.trim(),
    };

    if (isRefinement && generatedPost) {
      payload.previousTitle = generatedPost.title;
      payload.previousBody = generatedPost.body;
    }

    try {
      const response = await fetch("/api/ai/paraphrase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate paraphrased post.");
      }

      setGeneratedPost({
        title: data.title,
        body: data.body,
      });
    } catch (err: any) {
      console.error("Paraphrase generation failed:", err);
      setAiError(err.message || "Something went wrong while generating the paraphrased post.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyTitle = () => {
    if (!generatedPost) return;
    navigator.clipboard.writeText(generatedPost.title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleCopyBody = () => {
    if (!generatedPost) return;
    navigator.clipboard.writeText(generatedPost.body);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const handleCopyFull = () => {
    if (!generatedPost) return;
    navigator.clipboard.writeText(`Title: ${generatedPost.title}\n\n${generatedPost.body}`);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  // Clean and sanitize subreddit parameter
  const getCleanSubreddit = () => {
    let sub = subreddit.trim().toLowerCase();
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

  // Construct target Reddit JSON endpoint dynamically
  const cleanSub = getCleanSubreddit();
  const apiTimeframe = timeframe === "6months" ? "year" : timeframe;
  const apiLimit = timeframe === "6months" ? "100" : limit;
  const targetUrl = cleanSub && sort && apiTimeframe && apiLimit
    ? `https://www.reddit.com/r/${cleanSub}/${sort}.json?t=${apiTimeframe}&limit=${apiLimit}`
    : "";

  const handleOpenReddit = () => {
    if (!subreddit.trim()) {
      setError("Please enter a valid subreddit name first.");
      return;
    }
    if (!timeframe) {
      setError("Please select a time interval first.");
      return;
    }
    if (!sort) {
      setError("Please select a metrics sorting option first.");
      return;
    }
    if (!limit) {
      setError("Please select a post count limit first.");
      return;
    }
    setError(null);
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  // Client-side JSON parsing and sanitization logic
  const handleParseAndDisplay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subreddit.trim()) {
      setError("Please enter a valid subreddit name first.");
      return;
    }
    if (!timeframe) {
      setError("Please select a time interval first.");
      return;
    }
    if (!sort) {
      setError("Please select a metrics sorting option first.");
      return;
    }
    if (!limit) {
      setError("Please select a post count limit first.");
      return;
    }
    if (!rawJson.trim()) {
      setError("Please paste the copied Reddit JSON payload into the text area below.");
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const rawData = JSON.parse(rawJson);

        // Validate GFM / Reddit Listing format integrity
        if (!rawData || rawData.kind !== "Listing" || !rawData.data || !Array.isArray(rawData.data.children)) {
          throw new Error("Invalid structure. The text doesn't look like a complete Reddit JSON Listing feed.");
        }

        const children = rawData.data.children;
        
        // Filter by 6 months if selected
        let filteredChildren = children;
        if (timeframe === "6months") {
          const cutoff = new Date();
          cutoff.setMonth(cutoff.getMonth() - 6);
          const cutoffTime = cutoff.getTime();
          filteredChildren = children.filter((child: any) => {
            const createdUtc = child.data?.created_utc;
            return createdUtc ? (createdUtc * 1000 >= cutoffTime) : false;
          });
        }

        const postsLimit = parseInt(limit, 10);

        const mappedPosts: Post[] = filteredChildren.slice(0, postsLimit).map((child: any) => {
          const data = child.data || {};
          
          const rawThumbnail = data.thumbnail;
          const cleanThumbnail = cleanRedditUrl(rawThumbnail);

          const permalink = data.permalink || "";
          const threadUrl = `https://www.reddit.com${permalink}`;

          return {
            id: data.id || Math.random().toString(36).substring(7),
            title: data.title || "Untitled",
            author: data.author || "anonymous",
            upvotes: typeof data.score === "number" ? data.score : (data.ups || 0),
            comments: typeof data.num_comments === "number" ? data.num_comments : 0,
            posted_at: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : new Date().toISOString(),
            thumbnail: cleanThumbnail,
            url: threadUrl,
            nsfw: !!data.over_18,
            selftext: data.selftext || "",
          };
        });

        setPosts(mappedPosts);
        setTotalPosts(mappedPosts.length);
        setError(null);
        
        // Optionally clear the textarea for clean visual state
        setRawJson("");
      } catch (err: any) {
        console.error("JSON Parsing failed:", err);
        setError(`Failed to parse JSON: ${err.message || "Please make sure you copied the entire page content (Ctrl+A) from the JSON tab."}`);
        setPosts(null);
      }
    });
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (!posts || posts.length === 0) return;

    // Header fields
    const headers = ["ID", "Title", "Author", "Upvotes", "Comments", "Posted At", "NSFW", "Thread URL"];
    
    // Build rows safely escaping strings containing double quotes or commas
    const rows = posts.map((post) => {
      const cleanTitle = post.title.replace(/"/g, '""');
      const cleanAuthor = post.author.replace(/"/g, '""');
      
      return [
        `"${post.id}"`,
        `"${cleanTitle}"`,
        `"${cleanAuthor}"`,
        post.upvotes,
        post.comments,
        `"${post.posted_at}"`,
        post.nsfw ? "TRUE" : "FALSE",
        `"${post.url}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${getCleanSubreddit()}_trends_report.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased pb-24 font-sans select-none">
      
      {/* Structural Sharp Header (Strict dashboard grid layout) */}
      <header className="border-b border-slate-900 bg-slate-950 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center shadow shadow-orange-500/10">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.29-1.72l1.24-3.9 3.42.77c.05.9.79 1.62 1.7 1.62 1.04 0 1.89-.85 1.89-1.89s-.85-1.89-1.89-1.89c-.73 0-1.36.42-1.68 1.03l-3.8-.85c-.17-.04-.34.05-.39.22L11 8c-2.48.04-4.73.68-6.39 1.69-.57-.75-1.46-1.22-2.46-1.22-1.65 0-3 1.35-3 3 0 1 .5 1.9 1.27 2.47-.07.4-.1.81-.1 1.23 0 4.14 4.8 7.5 10.72 7.5 5.9 0 10.7-3.36 10.7-7.5 0-.41-.03-.82-.09-1.21.73-.57 1.22-1.46 1.22-2.46zM6 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm9 4.25c-1.8 1.8-5.2 1.8-7 0-.15-.15-.15-.4 0-.55.15-.15.4-.15.55 0 1.5 1.5 4.4 1.5 5.9 0 .15-.15.4-.15.55 0 .15.15.15.4 0 .55zm-1.25-2.25c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-base uppercase tracking-wider text-slate-100">
              Reddit Trend Fetcher
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded border border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
              ● Serverless Mode
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Title Section (Minimalistic and structured typography) */}
        <div className="mb-12 border-l-2 border-orange-600 pl-5">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100 uppercase font-mono">
            Subreddit Engagement Analytics
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-3xl">
            A precise, serverless data extraction toolkit designed to clean, sort, and visualize community post metrics.
          </p>
        </div>

        {/* Structured Grid Form Panel (Sharp, border-defined inputs) */}
        <section className="mb-6 bg-slate-900/60 border border-slate-900 rounded-xl p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
            
            {/* Subreddit Input */}
            <div className="flex flex-col gap-2">
              <label htmlFor="sub" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                Subreddit Name
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-xs font-mono">r/</span>
                <input
                  id="sub"
                  type="text"
                  placeholder="technology"
                  value={subreddit}
                  onChange={(e) => setSubreddit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 pl-7 pr-3 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            {/* Timeframe Select */}
            <div className="flex flex-col gap-2">
              <label htmlFor="time" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                Time Interval
              </label>
              <select
                id="time"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono cursor-pointer"
              >
                <option value="" disabled>-- Select Timeframe --</option>
                <option value="day">Last 24 Hours</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="6months">Last 6 Months</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Sort order select */}
            <div className="flex flex-col gap-2">
              <label htmlFor="sort-by" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                Metrics Sorting
              </label>
              <select
                id="sort-by"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono cursor-pointer"
              >
                <option value="" disabled>-- Select Sort --</option>
                <option value="top">Top Upvoted</option>
                <option value="hot">Hot (Trending)</option>
                <option value="new">Newest Posts</option>
                <option value="rising">Rising Activity</option>
              </select>
            </div>

            {/* Limit select */}
            <div className="flex flex-col gap-2">
              <label htmlFor="limit" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                Post Count Limit
              </label>
              <select
                id="limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono cursor-pointer"
              >
                <option value="" disabled>-- Select Limit --</option>
                <option value="5">5 Posts</option>
                <option value="10">10 Posts</option>
                <option value="20">20 Posts</option>
                <option value="50">50 Posts</option>
                <option value="100">100 Posts</option>
              </select>
            </div>

          </div>
        </section>

        {/* Action board: Sharp column-grid partitions */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
          
          {/* Step 1: Link Retrieval */}
          <div className="lg:col-span-2 bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <span className="w-5 h-5 rounded bg-orange-600/10 text-orange-500 text-[10px] font-bold flex items-center justify-center font-mono border border-orange-500/20">01</span>
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 font-mono">Open API Feed</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Retrieve the Reddit raw JSON feed for <code className="text-slate-300 font-mono">r/{cleanSub || "subreddit"}</code>. Copy the raw page using <kbd className="bg-slate-950 px-1 py-0.5 rounded text-[10px] border border-slate-850">Ctrl+A</kbd> and <kbd className="bg-slate-950 px-1 py-0.5 rounded text-[10px] border border-slate-850">Ctrl+C</kbd>.
              </p>
            </div>
            
            <button
              onClick={handleOpenReddit}
              className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-200 hover:text-white font-bold py-2.5 rounded-lg text-xs font-mono transition-all flex items-center justify-center gap-2 shadow"
            >
              Open Reddit Feed
              <svg className="w-3.5 h-3.5 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>

          {/* Step 2: Paste and Render */}
          <form onSubmit={handleParseAndDisplay} className="lg:col-span-3 bg-slate-900/40 border border-slate-900 rounded-xl p-5 flex flex-col justify-between">
            <div className="flex flex-col gap-3 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold flex items-center justify-center font-mono border border-purple-500/20">02</span>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200 font-mono">Process JSON</h3>
                </div>
                {rawJson.trim() && (
                  <button 
                    type="button" 
                    onClick={() => setRawJson("")}
                    className="text-[10px] text-slate-500 hover:text-slate-300 font-mono uppercase tracking-wider"
                  >
                    [Clear]
                  </button>
                )}
              </div>

              <textarea
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                placeholder="Paste JSON Listing (starts with { 'kind': 'Listing' ... })"
                className="w-full flex-1 min-h-[90px] bg-slate-950 border border-slate-850 rounded-lg p-3 text-[11px] text-slate-300 focus:outline-none focus:border-slate-700 transition-all font-mono resize-none placeholder-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-slate-100 hover:bg-white text-slate-950 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                "Compile & Display Trends"
              )}
            </button>
          </form>
        </section>

        {/* Error alert Banner (Crisp layout, sharp borders) */}
        {error && (
          <div className="animate-fade-in mb-8 bg-red-950/20 border border-red-900/60 rounded-xl p-4 flex gap-3 text-red-300 font-mono">
            <svg className="w-5 h-5 flex-shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-xs">
              <h4 className="font-bold uppercase tracking-wider text-red-400">Error Triggered</h4>
              <p className="mt-1 text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Metadata Details Row + Sharp CSV Downloader */}
        {posts && (
          <div className="animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 bg-slate-900/40 border border-slate-900 rounded-xl px-5 py-4 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-400">
              <span>SUBREDDIT: <strong className="text-slate-200">r/{subreddit}</strong></span>
              <span className="w-1 h-1 rounded-full bg-slate-800" />
              <span>SORT: <strong className="text-slate-200">{sort.toUpperCase()}</strong></span>
              <span className="w-1 h-1 rounded-full bg-slate-800" />
              <span>TIMEFRAME: <strong className="text-slate-200">{timeframe === "6months" ? "LAST 6 MONTHS" : timeframe.toUpperCase()}</strong></span>
              <span className="w-1 h-1 rounded-full bg-slate-800" />
              <span>POSTS: <strong className="text-slate-200">{totalPosts}</strong></span>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-900/60 hover:border-emerald-800/80 text-emerald-400 hover:text-emerald-300 font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all shadow"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to CSV
            </button>
          </div>
        )}

        {/* Post Cards Grid (Responsive, sharp grids with 1px slate-900 borders) */}
        {!isPending && posts && (
          <div className="animate-slide-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group relative bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
              >
                <div>
                  {/* Card Header Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3.5 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <span className="font-semibold text-slate-400 truncate max-w-[140px]">
                      u/{post.author}
                    </span>
                    <span className="flex items-center gap-1.5 flex-shrink-0">
                      {getRelativeTime(post.posted_at)}
                    </span>
                  </div>

                  {/* Post Title */}
                  <h3 className="font-bold text-sm leading-snug text-slate-200 group-hover:text-slate-100 transition-colors mb-4 line-clamp-3">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline focus:outline-none"
                    >
                      {post.title}
                    </a>
                  </h3>
                </div>

                {/* Media Section: Thumbnail with NSFW blur treatments */}
                {post.thumbnail && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-950 bg-slate-950 mb-5 flex items-center justify-center">
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        post.nsfw && !revealedNsfw[post.id] ? "blur-[20px] scale-105 pointer-events-none" : ""
                      }`}
                    />

                    {/* NSFW Shield Mask Overlay (Sharp lines, warning colors) */}
                    {post.nsfw && !revealedNsfw[post.id] && (
                      <div className="absolute inset-0 bg-red-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center">
                        <span className="bg-red-700 text-white font-bold text-[9px] tracking-widest uppercase px-2 py-0.5 rounded mb-2 border border-red-500/30">
                          NSFW 18+
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleNsfwReveal(post.id)}
                          className="bg-slate-950 hover:bg-slate-900 text-slate-200 hover:text-white text-[10px] font-bold py-1.5 px-3 rounded border border-slate-800 transition-all font-mono uppercase tracking-wider"
                        >
                          Reveal Media
                        </button>
                      </div>
                    )}

                    {/* Revealed NSFW button to re-hide */}
                    {post.nsfw && revealedNsfw[post.id] && (
                      <button
                        type="button"
                        onClick={() => toggleNsfwReveal(post.id)}
                        className="absolute bottom-2 right-2 bg-slate-950/80 hover:bg-slate-950 text-red-400 text-[9px] font-bold px-2 py-1 rounded border border-slate-900 transition-all font-mono"
                      >
                        [HIDE NSFW]
                      </button>
                    )}
                  </div>
                )}

                {/* Card Footer Engagement (Monospaced metrics) */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-900/60 text-[11px] font-mono text-slate-500 mt-auto">
                  <div className="flex gap-4 items-center">
                    {/* Upvote Badge */}
                    <span className="flex items-center gap-1.5 font-bold hover:text-orange-400 transition-colors">
                      <svg className="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                      </svg>
                      {formatNumber(post.upvotes)}
                    </span>

                    {/* Comments Badge */}
                    <span className="flex items-center gap-1.5 font-bold hover:text-purple-400 transition-colors">
                      <svg className="w-3.5 h-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      {formatNumber(post.comments)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectPostForParaphrase(post)}
                      className="flex items-center gap-1 font-bold text-orange-500 hover:text-orange-400 transition-all focus:outline-none cursor-pointer"
                    >
                      🪄 PARAPHRASE
                    </button>
                    <span className="text-slate-800">|</span>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-slate-500 hover:text-slate-355 transition-all focus:outline-none"
                    >
                      OPEN
                      <svg className="w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* AI Workspace Section */}
        {posts && (
          <section id="ai-workspace" className="mt-16 bg-slate-900/40 border border-slate-900 rounded-xl p-6 shadow-sm scroll-mt-24">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-900 pb-4">
              <span className="w-6 h-6 rounded bg-orange-600/10 text-orange-500 text-xs font-bold flex items-center justify-center font-mono border border-orange-500/20">🪄</span>
              <h2 className="font-bold text-sm uppercase tracking-wider text-slate-100 font-mono">
                AI Post Paraphraser Workspace
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Input Form */}
              <form onSubmit={(e) => handleGenerateParaphrase(e, !!generatedPost)} className="flex flex-col justify-between gap-5">
                <div className="flex flex-col gap-4">
                  {/* Link Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="ai-link" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                      Selected Post URL / Link
                    </label>
                    <input
                      id="ai-link"
                      type="text"
                      placeholder="Paste the post URL link here (or click PARAPHRASE on a card above)..."
                      value={aiPostLink}
                      onChange={(e) => handleLinkChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg py-2.5 px-3.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono"
                    />
                    {matchedPost ? (
                      <p className="text-[10px] text-emerald-450 font-mono flex items-center gap-1 mt-1">
                        <span>✅</span> Matched: "{matchedPost.title.substring(0, 60)}{matchedPost.title.length > 60 ? '...' : ''}"
                      </p>
                    ) : aiPostLink.trim() ? (
                      <p className="text-[10px] text-amber-500 font-mono mt-1">
                        ⚠️ No matching post found in the loaded results. Make sure the URL belongs to a post in the list above.
                      </p>
                    ) : null}
                  </div>

                  {/* Custom Angle / Ideas Input */}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="ai-idea" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                      Add Custom Angle / New Idea (Optional)
                    </label>
                    <textarea
                      id="ai-idea"
                      placeholder="e.g. rewrite this post for a SaaS audience, make it more punchy, or add a joke about coding..."
                      value={additionalIdea}
                      onChange={(e) => setAdditionalIdea(e.target.value)}
                      className="w-full h-28 bg-slate-950 border border-slate-850 rounded-lg p-3 text-xs text-slate-300 focus:outline-none focus:border-slate-800 font-mono resize-none placeholder-slate-700"
                    />
                  </div>
                </div>

                {generatedPost ? (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <button
                      type="button"
                      onClick={(e) => handleGenerateParaphrase(e, true)}
                      disabled={isGenerating || !matchedPost}
                      className="w-full bg-slate-100 hover:bg-white text-slate-950 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      {isGenerating ? "Refining..." : "Regenerate"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleGenerateParaphrase(e, false)}
                      disabled={isGenerating || !matchedPost}
                      className="w-full border border-slate-850 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow cursor-pointer"
                    >
                      Start Fresh
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isGenerating || !matchedPost}
                    className="w-full bg-slate-100 hover:bg-white text-slate-950 font-bold py-2.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-slate-950" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Paraphrasing with AI...
                      </>
                    ) : (
                      "Generate Paraphrased Post"
                    )}
                  </button>
                )}
              </form>

              {/* Right Column: AI Output */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 flex flex-col justify-between min-h-[300px]">
                {generatedPost ? (
                  <div className="flex flex-col justify-between h-full gap-5">
                    <div>
                      {/* Generated Title Header */}
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-900">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500 font-mono">Generated Title</span>
                        <button
                          onClick={handleCopyTitle}
                          className="text-[10px] text-slate-500 hover:text-slate-200 font-mono uppercase flex items-center gap-1 cursor-pointer"
                        >
                          {copiedTitle ? "[Copied!]" : "[Copy Title]"}
                        </button>
                      </div>
                      <h3 className="font-bold text-sm text-slate-200 font-sans mb-5 leading-snug">
                        {generatedPost.title}
                      </h3>

                      {/* Generated Body Header */}
                      <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-900">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500 font-mono">Generated Content</span>
                        <button
                          onClick={handleCopyBody}
                          className="text-[10px] text-slate-500 hover:text-slate-200 font-mono uppercase flex items-center gap-1 cursor-pointer"
                        >
                          {copiedBody ? "[Copied!]" : "[Copy Content]"}
                        </button>
                      </div>
                      <div className="space-y-1">
                        {renderMarkdown(generatedPost.body)}
                      </div>
                    </div>

                    <button
                      onClick={handleCopyFull}
                      className="w-full border border-slate-900 hover:border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 text-slate-300 font-mono text-[10px] py-2 rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 mt-4 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy Full Title & Post
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-10">
                    <div className="w-10 h-10 rounded bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 mb-4">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    {aiError ? (
                      <div className="text-red-400 font-mono text-xs max-w-sm">
                        <p className="font-bold uppercase text-[9px] tracking-wider text-red-500">Error Generating</p>
                        <p className="mt-1.5 text-red-300/80 leading-relaxed">{aiError}</p>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider font-mono">Waiting for input</h4>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-[240px] leading-relaxed font-mono">
                          Select a post from the list above, add your custom angle, and click generate to create a new similar post.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Empty Search Landing Page State */}
        {!isPending && !posts && (
          <div className="text-center py-20 bg-slate-900/[0.05] border border-dashed border-slate-900 rounded-xl p-8 max-w-xl mx-auto flex flex-col items-center">
            <div className="w-12 h-12 rounded bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 mb-5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider font-mono">Discover Subreddit Trends</h3>
            <p className="text-xs text-slate-500 mt-3 max-w-md leading-relaxed font-mono">
              Fill in the subreddit parameters in the toolbar above, click "Open Reddit Feed" to retrieve the raw JSON data, and paste it to inspect clean engagement reports.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 bg-slate-950 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-[10px] font-mono uppercase tracking-wider text-slate-600">
          <p>© {new Date().getFullYear()} Reddit Trend Fetcher. Pure static clientless application.</p>
        </div>
      </footer>
    </div>
  );
}
