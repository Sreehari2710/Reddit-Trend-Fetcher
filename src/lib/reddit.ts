const FETCH_TIMEOUT = 20000;

let browserInstance: any = null;
let cookiesReady = false;

async function getBrowser() {
  if (browserInstance) return browserInstance;

  const puppeteer = (await import("puppeteer")).default;

  browserInstance = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--window-size=1920,1080",
    ],
  });

  return browserInstance;
}

const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = { runtime: {} };
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = (parameters) =>
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters);
`;

// Visit reddit.com once to collect Akamai session cookies.
// Without these cookies, direct .json requests get blocked immediately.
async function warmUpCookies(browser: any) {
  if (cookiesReady) return;

  const page = await browser.newPage();
  try {
    await page.evaluateOnNewDocument(STEALTH_SCRIPT);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    // Visit the homepage first — like a real human would
    await page.goto("https://www.reddit.com", {
      waitUntil: "networkidle2",
      timeout: FETCH_TIMEOUT,
    });

    // Small delay to let Akamai challenge cookies settle
    await new Promise((r) => setTimeout(r, 2000));

    cookiesReady = true;
  } finally {
    await page.close().catch(() => {});
  }
}

async function fetchRedditJson(url: string): Promise<any> {
  const browser = await getBrowser();

  // First time: visit reddit.com to get cookies
  await warmUpCookies(browser);

  const page = await browser.newPage();

  try {
    await page.evaluateOnNewDocument(STEALTH_SCRIPT);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: FETCH_TIMEOUT,
    });

    const bodyText = await page.evaluate(() => {
      const pre = document.querySelector("pre");
      if (pre) return pre.textContent || "";
      return document.body?.innerText || "";
    });

    if (!bodyText.trim()) {
      throw new Error("Empty response from Reddit");
    }

    try {
      return JSON.parse(bodyText);
    } catch {
      const preview = bodyText.substring(0, 300);
      throw new Error(`Reddit returned non-JSON: "${preview}"`);
    }
  } finally {
    await page.close().catch(() => {});
  }
}

// --- Public API functions ---

export async function fetchSubredditPosts(
  subreddit: string,
  sort: string,
  timeframe: string,
  limit: number
): Promise<any> {
  const cleanSub = subreddit
    .trim()
    .toLowerCase()
    .replace(/^\/?r\//i, "")
    .replace(/\/$/, "");

  if (!/^[a-z0-9_]{2,21}$/.test(cleanSub)) {
    throw new Error("Invalid subreddit name");
  }

  const apiTimeframe = timeframe === "6months" ? "year" : timeframe;
  const apiLimit = timeframe === "6months" ? 100 : limit;

  const url = `https://www.reddit.com/r/${cleanSub}/${sort}.json?t=${apiTimeframe}&limit=${apiLimit}`;
  return fetchRedditJson(url);
}

export async function searchPosts(
  keyword: string,
  sort?: string,
  timeframe?: string,
  limit?: number
): Promise<any> {
  const cleanKeyword = keyword.trim();
  if (!cleanKeyword) {
    throw new Error("Keyword is required");
  }

  const params = new URLSearchParams();
  params.set("q", cleanKeyword);
  if (sort) params.set("sort", sort);
  if (timeframe) params.set("t", timeframe);
  if (limit) params.set("limit", String(limit));

  const url = `https://www.reddit.com/search.json?${params.toString()}`;
  return fetchRedditJson(url);
}

export async function searchSubreddits(
  query: string,
  limit: number
): Promise<any> {
  const cleanQuery = query
    .trim()
    .toLowerCase()
    .replace(/^\/?r\//i, "")
    .replace(/\/$/, "");

  if (!cleanQuery) {
    throw new Error("Search query is required");
  }

  const url = `https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(cleanQuery)}&limit=${limit}`;
  return fetchRedditJson(url);
}
