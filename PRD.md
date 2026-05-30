# Reddit Top Posts Tool — Product Requirement Document (PRD)

**Product Name:** Reddit Trend Fetcher

---

## 1. Overview

A lightweight tool that fetches top-performing Reddit posts from a specified subreddit without using Reddit OAuth/API credentials.

Users can:
- Enter a subreddit
- Select a timeframe
- Choose number of posts
- View top posts instantly

The tool uses Reddit's public `.json` endpoints for free access.

---

## 2. Problem Statement

Users want to quickly discover trending Reddit content from specific subreddits without manually browsing Reddit.

**Current issues:**
- Reddit UI is cluttered
- Hard to filter top posts by timeframe
- No simple export/API-ready tool
- Official Reddit API requires OAuth setup

This product solves that by providing a simple, clean interface for Reddit trend discovery.

---

## 3. Goals

### Primary Goals
- Fetch top Reddit posts
- Support timeframe filtering
- Support configurable post count
- No Reddit API authentication required
- Fast response times
- Completely free to operate

### Secondary Goals
- Export results (e.g., CSV, JSON)
- Multi-subreddit support
- AI summarization of top threads
- Trending analytics over time

---

## 4. Target Users

### Primary Users
- Content creators
- Social media managers
- Marketers
- Researchers
- SaaS founders
- Newsletter writers

### Secondary Users
- Developers
- Reddit power users
- SEO researchers

---

## 5. Core Features

### 5.1 Subreddit Input
User enters a subreddit name (e.g., `technology`).

**Validation:**
- Trim spaces
- Remove `/r/` or `r/` prefix if present
- Convert to lowercase

### 5.2 Timeframe Selection
Supported options:

| Label | Reddit API Value |
| :--- | :--- |
| **Last 24 Hours** | `day` |
| **Last Week** | `week` |
| **Last Month** | `month` |
| **Last Year** | `year` |
| **All Time** | `all` |

### 5.3 Post Limit Selection
User can choose the number of posts to retrieve:
- `5`
- `10` *(Default)*
- `20`
- `50`
- `100`

### 5.4 Sort Types
Supported options:

| Sort | Endpoint | Description |
| :--- | :--- | :--- |
| **Top** | `top.json` | Top posts by upvotes in timeframe *(Default)* |
| **Hot** | `hot.json` | Hot trending posts |
| **New** | `new.json` | Most recently posted |
| **Rising** | `rising.json` | Rapidly rising posts |

---

## 6. API Design

### Endpoint
`GET /api/reddit/posts`

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `subreddit` | `string` | **Yes** | The subreddit name (e.g., `startups`) |
| `timeframe` | `string` | No | Timeframe filter (default: `all`) |
| `limit` | `number` | No | Max posts to return (default: `10`) |
| `sort` | `string` | No | Sort order (default: `top`) |

### Example Request
```http
GET /api/reddit/posts?subreddit=startups&timeframe=month&limit=10&sort=top
```

---

## 7. Reddit Source URL
Internally, the backend will query:
```
https://www.reddit.com/r/${subreddit}/${sort}.json?t=${timeframe}&limit=${limit}
```

**Example:**
```
https://www.reddit.com/r/entrepreneur/top.json?t=week&limit=10
```

---

## 8. Response Format

### Success Response
```json
{
  "success": true,
  "subreddit": "entrepreneur",
  "timeframe": "week",
  "sort": "top",
  "total_posts": 10,
  "posts": [
    {
      "id": "abc123",
      "title": "Built my SaaS to $10k MRR",
      "author": "founder_x",
      "upvotes": 5200,
      "comments": 480,
      "posted_at": "2026-05-20T10:00:00Z",
      "thumbnail": "https://...",
      "url": "https://reddit.com/r/entrepreneur/comments/abc123",
      "nsfw": false
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "message": "Subreddit not found"
}
```

---

## 9. UI Requirements

### Main Screen
A clean, responsive dashboard showing control inputs and results side-by-side or stacked.

#### Input Section
- Subreddit text box (with placeholder)
- Timeframe dropdown
- Sort dropdown
- Limit dropdown
- **Fetch Posts** button (with loading spinner state)

#### Results Section
Each post card should display:
- Post title (link to Reddit URL)
- Upvote count
- Comment count
- Author name
- Posted timestamp (formatted as relative time)
- Thumbnail image (if available)
- **Open on Reddit** primary action button

---

## 10. Technical Stack

- **Frontend (Recommended):** Next.js, Tailwind CSS
- **Backend (Recommended):** Node.js, Express.js
- **Hosting:** Free deployment friendly (Vercel, Render, Railway)

---

## 11. Non-Functional Requirements

| Requirement | Target |
| :--- | :--- |
| **Response Time** | `< 2 seconds` |
| **Mobile Friendly** | 100% responsive design |
| **Free Hosting Compatible** | Runs on standard free tiers without server requirements |
| **No OAuth Required** | Absolutely no credentials or setup required |
| **Cache Support** | Built-in caching to avoid IP-level rate-limiting |

---

## 12. Caching Strategy

To avoid reaching Reddit API/scraper rate limits:

### Suggested Cache Time

| Endpoint / Sort | Cache Duration | Reason |
| :--- | :--- | :--- |
| `top/day` | 5 minutes | Frequently updated |
| `top/week` | 15 minutes | Moderately updated |
| `top/month` | 1 hour | Rarely updated |

### Recommended Cache Implementations
- **In-Memory Cache:** Simple Node.js memory cache (`node-cache`) for MVP.
- **Redis:** For scaled deployment.
- **Edge Caching:** CDN level caching (e.g., Vercel / Cloudflare edge).

---

## 13. Rate Limit Handling

### Potential Issues
Reddit may return:
- `429 Too Many Requests`

### Mitigation Options
- Implement caching (defined in Section 12)
- Add request delays/throttling per IP
- Avoid parallel duplicate requests (deduplication)
- Add fallback retries with exponential backoff

---

## 14. Security Requirements

### Input Validation
Prevent:
- Invalid characters in subreddit names (alphanumeric and underscores only)
- Script injection (sanitize inputs)
- Excessively large limits (cap request `limit` parameter)

### Allowed Limits
- Minimum: `1`
- Maximum: `100`

---

## 15. Future Features

### Phase 2
- Multi-subreddit search/consolidation
- AI-powered summary of posts and top comments
- Sentiment analysis of post titles
- Export results to CSV/JSON format
- Scheduled email reports
- Saved searches (browser localStorage or database)

### Phase 3
- Full comment thread extraction and semantic search
- Custom trending score calculations
- Real-time keyword alerts
- Unsupervised trending topic clustering

---

## 16. Example User Flow

### User Journey
1. User enters `subreddit = startups`.
2. User selects `timeframe = month`.
3. User selects `limit = 10`.
4. User clicks **Fetch Posts**.
5. Backend makes a server-to-server HTTP request to the public Reddit JSON endpoint.
6. The JSON payload is filtered, cached, and mapped to the success schema.
7. Results are rendered in dynamic cards on the UI.

---

## 17. Folder Structure

```text
reddit-tool/
├── client/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── styles/
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── utils/
│   └── middleware/
│
└── README.md
```

---

## 18. MVP Scope

### Included
- Single subreddit querying
- Timeframe filtering
- Custom post count limits
- Sort type selection
- Clean JSON REST API
- Responsive frontend client

### Excluded
- User registration and authentication
- Persistent backend database
- Detailed analytics dashboards
- AI content summarization
- Email or push notifications

---

## 19. Success Metrics

| Metric | Target Goal |
| :--- | :--- |
| **API Response Time** | `< 2 seconds` |
| **Successful Fetch Rate** | `> 95%` |
| **Error Rate** | `< 5%` |
| **Mobile Usability** | 100% responsive and readable |

---

## 20. Final Recommendation

Build the MVP using **Next.js** and **Node.js** querying Reddit's public `.json` endpoints. Deploy on **Vercel** for optimal speed, SEO benefits, and absolute zero infrastructure cost.

**Benefits of this approach:**
- Zero infrastructure cost
- No complex OAuth setup
- Rapid developer turnaround time
- Seamless, serverless scalability for MVP traffic