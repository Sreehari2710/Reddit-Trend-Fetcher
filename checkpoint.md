# Reddit Trend Fetcher — Implementation Checkpoints

This document serves as our master roadmap for building the **Reddit Trend Fetcher** application. Each checkpoint represents a critical milestone in the development lifecycle. To ensure absolute correctness, each checkpoint includes detailed **Test Cases** that must pass before we mark the milestone as completed.

## Progress Overview

- [x] **Checkpoint 1:** Project Setup & Core Configuration
- [x] **Checkpoint 2:** Backend API Implementation (`/api/reddit/posts`)
- [x] **Checkpoint 3:** Backend Validation, Caching & Error Handling
- [x] **Checkpoint 4:** Frontend Layout & Input Dashboard UI
- [x] **Checkpoint 5:** Frontend-Backend Integration & State Management
- [x] **Checkpoint 6:** Post Card Grid UI & Polish (Upvotes, Comments, NSFW, Relative Timestamps)
- [x] **Checkpoint 7:** Full System Verification, Optimization & Documentation

---

## Detailed Checkpoints & Test Cases

### [x] Checkpoint 1: Project Setup & Core Configuration
*Set up the development environment, initialize a modern full-stack Next.js application, configure Tailwind CSS, and establish the directory structure.*

#### Tasks
- [x] Create a new Next.js application with TypeScript, ESLint, and Tailwind CSS.
- [x] Configure `next.config.js` or `package.json` to ensure optimal development environment settings.
- [x] Set up the recommended folder structure for client and API routes.
- [x] Clean up default boilerplate styles and establish a premium HSL-based color palette (vibrant dark/light theme) in `app/globals.css` or `styles/globals.css`.

#### Test Cases / Verification
- **Test Case 1.1: Build Setup Verification**
  - **Action:** Run the development server using `npm run dev`.
  - **Expected Result:** The server starts successfully on `http://localhost:3000` with no compilation warnings or errors.
- **Test Case 1.2: Tailwind CSS Verification**
  - **Action:** Add a custom styled element using tailwind classes (e.g., `<div class="bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 text-center font-bold">Tailwind Connected</div>`) in the root page.
  - **Expected Result:** The element renders with correct gradients, colors, padding, and font weight in the browser.

---

### [x] Checkpoint 2: Backend API Implementation (`/api/reddit/posts`)
*Create a server-side route that queries Reddit's public JSON endpoints, parses the response, and transforms it to fit our clean API schema.*

#### Tasks
- [x] Create the API route handler at `/api/reddit/posts` (Next.js route handler / Express route).
- [x] Implement query parameter parsing for `subreddit`, `timeframe`, `limit`, and `sort`.
- [x] Construct the Reddit `.json` target URL dynamically based on the input parameters.
- [x] Implement server-to-server fetch requests to Reddit's public endpoint.
- [x] Map the complex raw Reddit API response to our concise success payload schema:
  ```json
  {
    "success": true,
    "subreddit": "string",
    "timeframe": "string",
    "sort": "string",
    "total_posts": 10,
    "posts": [
      {
        "id": "string",
        "title": "string",
        "author": "string",
        "upvotes": 1234,
        "comments": 56,
        "posted_at": "ISO-8601-timestamp",
        "thumbnail": "string",
        "url": "string",
        "nsfw": false
      }
    ]
  }
  ```

#### Test Cases / Verification
- **Test Case 2.1: Basic Fetch Test**
  - **Action:** Query the local API using a browser or API client: `GET http://localhost:3000/api/reddit/posts?subreddit=startups&sort=top&limit=5&timeframe=month`
  - **Expected Result:** Status code `200 OK`. The response JSON matches the defined schema, contains exactly `5` posts from `r/startups`, and each post lists non-empty values for `id`, `title`, `author`, `upvotes`, `comments`, `posted_at`, and `url`.
- **Test Case 2.2: Timeframe & Sort Behavior**
  - **Action:** Fetch from a popular subreddit using two different timeframes/sorts (e.g., `sort=top&timeframe=day&limit=5` vs `sort=top&timeframe=all&limit=5`).
  - **Expected Result:** Status `200 OK` for both. The "all-time" query must return posts with significantly higher upvotes than the "day" query.

---

### [x] Checkpoint 3: Backend Validation, Caching & Error Handling
*Enhance the API with robust input sanitization, rate-limit mitigation (caching), and graceful error responses.*

#### Tasks
- [x] Sanitize the `subreddit` parameter (trim whitespace, remove `/r/` prefix, ensure alphanumeric and underscores only).
- [x] Enforce allowed query parameter limits (e.g., `limit` clamped between `1` and `100`, default `10`).
- [x] Implement an in-memory caching mechanism (`node-cache` or helper utility) to cache Reddit responses by endpoint + parameters.
- [x] Define varying cache times: `day` (5 min), `week` (15 min), `month/all` (1 hour).
- [x] Gracefully catch external network errors, non-existent subreddits (Reddit returning 404), or rate limits (Reddit returning 429), and return structured JSON errors.

#### Test Cases / Verification
- **Test Case 3.1: Subreddit Sanitization Test**
  - **Action:** Request `GET http://localhost:3000/api/reddit/posts?subreddit=/r/technology/&limit=5`.
  - **Expected Result:** Status `200 OK`. The API successfully processes the request as `technology` and strips the slashes/prefixes.
- **Test Case 3.2: Input Validation Failure**
  - **Action:** Request `GET http://localhost:3000/api/reddit/posts?subreddit=invalid*sub*name` or a limit of `999`.
  - **Expected Result:** Status `400 Bad Request` or appropriate sanitized response (e.g., limit clamped back to `100` and invalid sub name returning `400` with descriptive error JSON: `{"success": false, "message": "Invalid subreddit name format"}`).
- **Test Case 3.3: Cache hit validation**
  - **Action:** Fire the exact same request twice in a row: `GET http://localhost:3000/api/reddit/posts?subreddit=science&limit=10`. Track the API response time.
  - **Expected Result:** The first call response time might be `500ms - 1.5s` (outgoing Reddit call). The second call response time must be `< 50ms` (cache hit).
- **Test Case 3.4: Non-existent Subreddit Handling**
  - **Action:** Request a completely randomized, non-existent subreddit name: `GET http://localhost:3000/api/reddit/posts?subreddit=a_sub_that_does_not_exist_xyz123`.
  - **Expected Result:** Status `404 Not Found` or `200` with clean error JSON: `{"success": false, "message": "Subreddit not found or is private"}`.

---

### [x] Checkpoint 4: Frontend Layout & Input Dashboard UI
*Build a premium, modern user interface shell using best practices (curated dark mode, glassmorphism, responsive grid layout).*

#### Tasks
- [x] Install visual assets and load sleek typography (e.g., *Inter* or *Outfit* via Google Fonts).
- [x] Code the global header and layout shell with an elegant dark theme.
- [x] Design the floating control dashboard container (Glassmorphic cards, smooth transitions).
- [x] Add input fields for Subreddit search, Timeframe dropdown, Sort Type dropdown, and Post Limit dropdown.
- [x] Add interactive focus rings, premium hover states, and smooth click animations to all fields and buttons.

#### Test Cases / Verification
- **Test Case 4.1: Visual Design Inspection**
  - **Action:** Open application in browser. Inspect elements. Hover over input fields, dropdowns, and buttons.
  - **Expected Result:** Controls show a sleek, modern visual aesthetic. Hover states apply active transition effects (e.g., scale-ups, subtle drop shadows, or outline shifts) smoothly. No basic browser-default borders or outlines.
- **Test Case 4.2: Responsiveness Check**
  - **Action:** Toggle browser developer tools responsive view and shrink layout width to `360px` (mobile viewport).
  - **Expected Result:** Layout remains perfectly readable, and form inputs stack gracefully without horizontal scrolling or clipping.

---

### [x] Checkpoint 5: Frontend-Backend Integration & State Management
*Connect the interactive form to the backend API, managing asynchronous fetches, loading animations, and error popups.*

#### Tasks
- [x] Set up unified state hooks (`useState`, `useTransition`, or state store) to manage current inputs, fetch states, error messages, and fetched post data.
- [x] Implement the `fetchPosts` async logic triggered by the form submit or button click.
- [x] Design a premium skeleton loader system or dynamic custom spinner that displays while fetching.
- [x] Create a visually stunning Error Banner/Toast component to show descriptive backend error messages.
- [x] Clear previous search results when a new fetch request starts.

#### Test Cases / Verification
- **Test Case 5.1: API Fetch Flow**
  - **Action:** Enter `gaming` into the subreddit search bar and click the **Fetch Posts** button.
  - **Expected Result:** 
    1. The button enters a disabled, loading state with a spinner.
    2. Skeleton cards appear in place of results.
    3. Once the fetch completes, the skeleton cards disappear, and post titles are successfully printed.
- **Test Case 5.2: Error Presentation**
  - **Action:** Enter a non-existent subreddit `not_real_sub_1293` and click fetch.
  - **Expected Result:** Loading animations display, followed by the disappearance of skeletons and the rendering of a beautiful warning banner/toast: *"Subreddit not found or is private"*.

---

### [x] Checkpoint 6: Post Card Grid UI & Polish
*Create high-fidelity post cards showing metrics (upvotes, comments), thumbnails, relative time labels, and clear call-to-actions.*

#### Tasks
- [x] Design the grid layout for the results (responsive columns: 1 col on mobile, 2 cols on tablet, 3-4 cols on desktop).
- [x] Implement the **Post Card** component featuring:
  - Title that links out to the Reddit URL.
  - Quick-glance metadata row (posted by `u/author` alongside a relative timestamp helper e.g. "3 hours ago").
  - Engagement indicators: Upvotes and comments badges (formatted nicely, e.g., `5.2k` instead of `5200`).
  - Thumbnail display: If a post has a valid thumbnail image, render it elegantly with a placeholder fallback.
  - NSFW indicator: If `nsfw` is true, display a prominent warning badge and blur the thumbnail.
  - Primary button to "Open on Reddit" opening in a new tab.

#### Test Cases / Verification
- **Test Case 6.1: Metric Formatting Check**
  - **Action:** Fetch posts from a major subreddit (e.g., `pics`) that has high metric counts.
  - **Expected Result:** Posts with $>1,000$ upvotes display formatted numbers like `12.5k` or `84.2k`. Timestamps are formatted in a human-friendly relative format (e.g., "5 hours ago" or "2 days ago") instead of a raw ISO date string.
- **Test Case 6.2: NSFW Thumbnail Treatment**
  - **Action:** Query a subreddit that frequently contains NSFW posts or mock a post with `"nsfw": true`.
  - **Expected Result:** The card displays an red/orange "NSFW" badge, and the post's thumbnail is completely blurred out or hidden behind a warning mask.
- **Test Case 6.3: Post Link Target**
  - **Action:** Click on a post card title or the "Open on Reddit" button.
  - **Expected Result:** The target Reddit link opens instantly in a new browser tab (`target="_blank" rel="noopener noreferrer"`).

---

### [x] Checkpoint 7: Full System Verification, Optimization & Documentation
*Perform comprehensive end-to-end user journey tests, performance optimizations, and finalize documentation.*

#### Tasks
- [x] Audit the app layout for layout shifts and optimize performance (e.g., minimize font weight combinations, optimize component re-renders).
- [x] Perform comprehensive multi-browser tests (Chrome, Edge, Firefox, Safari).
- [x] Double-check and verify caching works under concurrent loads.
- [x] Set up standard metadata in `layout.tsx` or `index.html` (Title, Meta Description, SEO tags).
- [x] Write a rich `README.md` file outlining setup commands, API documentation, caching parameters, and folder structure.

#### Test Cases / Verification
- **Test Case 7.1: End-to-End User Flow**
  - **Action:** Clean browser cache. Go to the dashboard. Type `movies`, select `Last Month`, sort by `Top`, limit to `20`. Press enter or click fetch. Verify cards.
  - **Expected Result:** Application responds in under 1 second. 20 high-fidelity movie-related posts display cleanly in a responsive grid. Click "Open on Reddit" to check external link integrity.
- **Test Case 7.2: Build Verification**
  - **Action:** Run the production build command `npm run build` followed by a local production preview `npm run start` (or equivalent).
  - **Expected Result:** The project compiles into production assets with no linting errors, no type errors, and runs flawlessly.
