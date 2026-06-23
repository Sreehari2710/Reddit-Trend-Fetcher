import { type NextRequest } from "next/server";
import { fetchSubredditPosts } from "@/lib/reddit";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const subreddit = params.get("subreddit") || "";
    const sort = params.get("sort") || "top";
    const timeframe = params.get("t") || "day";
    const limit = parseInt(params.get("limit") || "10", 10);

    if (!subreddit.trim()) {
      return Response.json(
        { success: false, message: "Missing required parameter: subreddit" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return Response.json(
        { success: false, message: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const data = await fetchSubredditPosts(subreddit, sort, timeframe, limit);

    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Reddit posts fetch error:", error.message);
    return Response.json(
      { success: false, message: "Failed to fetch posts from Reddit. Please try again." },
      { status: 500 }
    );
  }
}
