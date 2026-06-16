import React from "react";

// Post schema matching the PRD
export interface Post {
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

// Related subreddit schema (from Reddit's subreddits/search.json)
export interface RelatedSubreddit {
  name: string;
  subscribers: number;
  createdAt: string;
  description: string;
  over18: boolean;
  icon: string | null;
  url: string;
}

// Helpers for metric abbreviations
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "m";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  }
  return num.toString();
}

// Helper to convert ISO dates into user-friendly relative duration strings
export function getRelativeTime(isoString: string): string {
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
export function cleanRedditUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
  return trimmed.replace(/&amp;/g, "&");
}

// Helper to render basic markdown bold & bullet lists in UI
export function renderMarkdown(text: string) {
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
