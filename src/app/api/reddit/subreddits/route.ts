import { type NextRequest } from "next/server";
import { searchSubreddits } from "@/lib/reddit";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get("q") || "";
    const limit = parseInt(params.get("limit") || "10", 10);

    if (!query.trim()) {
      return Response.json(
        { success: false, message: "Missing required parameter: q (subreddit name)" },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return Response.json(
        { success: false, message: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    // Request one extra to compensate for filtering out the exact-match subreddit
    const data = await searchSubreddits(query, limit + 1);

    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Reddit subreddits search error:", error.message);
    return Response.json(
      { success: false, message: "Failed to search subreddits. Please try again." },
      { status: 500 }
    );
  }
}
