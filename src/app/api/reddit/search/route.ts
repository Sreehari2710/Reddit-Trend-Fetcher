import { type NextRequest } from "next/server";
import { searchPosts } from "@/lib/reddit";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const keyword = params.get("q") || "";
    const sort = params.get("sort") || "";
    const timeframe = params.get("t") || "";
    const limit = params.get("limit") ? parseInt(params.get("limit")!, 10) : undefined;

    if (!keyword.trim()) {
      return Response.json(
        { success: false, message: "Missing required parameter: q (keyword)" },
        { status: 400 }
      );
    }

    if (limit !== undefined && (limit < 1 || limit > 100)) {
      return Response.json(
        { success: false, message: "Limit must be between 1 and 100" },
        { status: 400 }
      );
    }

    const data = await searchPosts(
      keyword,
      sort || undefined,
      timeframe || undefined,
      limit
    );

    return Response.json({ success: true, data });
  } catch (error: any) {
    console.error("Reddit search error:", error.message);
    return Response.json(
      { success: false, message: "Failed to search Reddit. Please try again." },
      { status: 500 }
    );
  }
}
