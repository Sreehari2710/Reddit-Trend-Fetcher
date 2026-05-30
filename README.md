# Reddit Trend Fetcher 🚀

Reddit Trend Fetcher is a lightweight, premium serverless web application designed to clean, extract, and analyze high-performing threads, engagement rates, and content metrics across any Reddit subreddit.

By leveraging an innovative **Browser-Fetch JSON Bypass Flow**, this application is **100% immune to API rate limits, Cloudflare bot-blocking, regional firewalls, or developer credential requirements**.

---

## 📂 Project Architecture

The application is structured as a purely client-side static Next.js React application directly in the root directory:

```text
Reddit Trend Fetcher/
├── public/                 # Static visual assets
├── src/
│   └── app/
│       ├── globals.css     # Premium Tailwind v4 theme & global styles
│       ├── layout.tsx      # Layout shell & local font configurations
│       └── page.tsx        # Standalone browser-fetch dashboard & card grid
├── package.json            # Frontend dependency settings
├── tsconfig.json           # TypeScript configuration
├── PRD.md                  # Product Requirement Document
├── checkpoint.md           # Master Implementation Checklist
└── output_example.json     # Sample Raw Reddit JSON Dataset
```

---

## ⚡ Quick Start & Run Instructions

To run the application locally, you only need to start the Next.js development server from the root directory.

```bash
# Install root dependencies
npm install

# Start the application in Development mode
npm run dev
```

*Simply open **`http://localhost:3000`** in your browser to interact with the dashboard!*

---

## 🔑 The Browser-Fetch JSON Bypass Flow

When platforms like Reddit place heavy anti-scraping walls (Cloudflare `403 Forbidden` or `429 Too Many Requests`) on servers or datacenter IPs, this application routes the fetch through the user's real browser, where cookies, SSL session certificates, and browser TCP/TLS fingerprints are fully validated.

### The 3-Step Flow:
1. **Configure Filters:** The user inputs the target `subreddit` name and selects `Timeframe`, `Sort By`, and `Post Count` limits.
2. **Open Feed ↗:** Clicking the **"Open Reddit Feed"** button opens the precise generated JSON endpoint dynamically in a new tab.
   - *Example: `https://old.reddit.com/r/technology/top.json?t=week&limit=10`*
   - The user selects all text (`Ctrl+A`) and copies it (`Ctrl+C`).
3. **Paste & Render:** The user pastes the raw text into our dashboard's dark-glassmorphism text field and clicks **"Parse & Render Trends"**. The client processes it instantly.

---

## ⚙️ Premium Core Features
- **Zero Server Overhead:** The entire cleaning, parsing, and rendering pipeline executes directly on the client, maximizing performance and enabling serverless deployment (e.g. static host on Vercel/Netlify for $0 cost).
- **Engagement Abbreviations:** Automatically shortens massive engagement numbers to clean formats (e.g., `2.8k`, `1.2m`).
- **Relative Timestamps:** Formats Unix epoch creation timestamps into descriptive durations (e.g. `"3h ago"`, `"12d ago"`).
- **Interactive NSFW Filters:** Detects adult posts on-the-fly, blurs their media thumbnails, and locks them behind a custom crimson warning card with toggle-reveal actions.
- **Micro-Animations & Skeletons:** Features smooth pulsing skeletons during data transitions and active glowing glassmorphism focus states.
- **Link Security:** Thread buttons open targeted Reddit links in new tabs safely with secure headers (`target="_blank" rel="noopener noreferrer"`).
