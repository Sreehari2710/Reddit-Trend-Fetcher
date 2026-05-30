# Implementation Plan — Manual Browser-Fetch JSON Fallback Flow

This document details the design and implementation plan to add a **Manual Browser-Fetch JSON** flow. This flow completely bypasses any CDN rate-limiting, Cloudflare blocks, or regional API restrictions (like `403 Forbidden` errors) by leveraging the user's real browser session to fetch the raw Reddit JSON feed.

---

## 💡 Concept & User Flow

Instead of failing when the Express server encounters a `403 Blocked` state, we will introduce a **hybrid query dashboard** supporting two modes:
1. **⚡ Direct Fetch Mode:** Attempts to fetch live data automatically through the Express server (optimal, single-click).
2. **🔑 Browser-Fetch Fallback Mode:**
   - **Step 1:** The user fills out Subreddit, Sort, and Timeframe filters.
   - **Step 2:** The app generates the precise Reddit public JSON feed URL and provides an **"Open Reddit JSON Feed ↗"** button.
   - **Step 3:** The user clicks the button. Their browser (which has correct TLS fingerprints, active session headers, and cookies) opens the JSON feed successfully in a new tab.
   - **Step 4:** The user copies the entire JSON payload (`Ctrl+A`, `Ctrl+C`).
   - **Step 5:** The user returns to our dashboard, pastes the raw JSON into an elegant dark-glassmorphic `<textarea>` input field, and clicks **"Parse & Render"**.
   - **Step 6:** The React client parses the JSON, structures it into our success schema, and renders the high-fidelity post cards immediately!

---

## 🛠️ Proposed Changes

### 1. [MODIFY] [page.tsx](file:///c:/Users/User/Desktop/Vuducom/Reddit%20Trend%20Fetcher/client/src/app/page.tsx)
We will upgrade the frontend dashboard to support the new manual browser-fetch UI and parsing parser.

- **UI Upgrades:**
  - Add a sleek tab control to switch between **⚡ Automatic Direct Fetch** and **🔑 Browser-Fetch (Anti-Block)**.
  - In Browser-Fetch mode, render a guide panel:
    1. A button to **Copy & Open generated URL** (e.g. opens `https://old.reddit.com/r/technology/top.json?t=week&limit=10` in a new tab).
    2. An elegant, expanding `<textarea>` input for pasting the copied JSON.
    3. A primary **"Parse & Display Trends"** button.
  - If Direct Fetch fails with a `403` or `429` block, display a clear prompt offering to **"Switch to Browser-Fetch Mode"** with a single click.

- **Parsing Integration:**
  - Build a client-side parser function in `page.tsx` that replicates our backend's mapping:
    ```typescript
    function parseRawRedditJson(rawJsonText: string, limit: number, subreddit: string): Post[] {
      const parsed = JSON.parse(rawJsonText);
      if (parsed.kind !== "Listing" || !parsed.data || !Array.isArray(parsed.data.children)) {
        throw new Error("Invalid Reddit JSON structure. Please ensure you copied the entire page.");
      }
      
      return parsed.data.children.slice(0, limit).map((child: any) => {
        const data = child.data || {};
        
        // Match our exact schema
        const cleanThumbnail = data.thumbnail && data.thumbnail.startsWith("http")
          ? data.thumbnail.replace(/&amp;/g, "&")
          : null;
          
        return {
          id: data.id || Math.random().toString(36).substring(7),
          title: data.title || "Untitled",
          author: data.author || "anonymous",
          upvotes: data.score || data.ups || 0,
          comments: data.num_comments || 0,
          posted_at: data.created_utc ? new Date(data.created_utc * 1000).toISOString() : new Date().toISOString(),
          thumbnail: cleanThumbnail,
          url: `https://www.reddit.com${data.permalink || ""}`,
          nsfw: !!data.over_18,
        };
      });
    }
    ```

---

## 🧪 Verification Plan

### Automated Build Verification
- Run `npm run build` inside `/client` folder to verify that client-side parsing structures compile cleanly without type warnings.

### Manual UX Verification Steps
1. **URL Generation Test:**
   - **Action:** Enter `subreddit = science`, `sort = top`, `timeframe = day`, `limit = 5`. Switch to **Browser-Fetch** mode.
   - **Expected Result:** The button href is generated exactly as: `https://old.reddit.com/r/science/top.json?t=day&limit=5`.
2. **Browser Navigation & Copy Test:**
   - **Action:** Click "Open Reddit JSON Feed ↗".
   - **Expected Result:** Opens a new tab in your real browser, displaying the raw JSON list successfully (proving your browser has bypassing authorization). Press `Ctrl+A` and `Ctrl+C`.
3. **Pasting & Rendering Test:**
   - **Action:** Paste the JSON into the `<textarea>` box and click "Parse & Display Trends".
   - **Expected Result:** Skeletons flash briefly, the textarea clears, and the cards grid renders exactly 5 post cards from `r/science` with upvote/comment counts, thumbnails, and relative times working flawlessly.
4. **Invalid JSON Handling:**
   - **Action:** Paste broken text (e.g. `"hello world"`) into the textarea and press parse.
   - **Expected Result:** A beautiful warning toast appears: *"Invalid Reddit JSON structure. Please ensure you copied the entire page."*
