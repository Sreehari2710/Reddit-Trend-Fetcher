import { type NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const { postTitle, postSelftext, subreddit, additionalIdea } = await request.json();

    if (!postTitle) {
      return Response.json(
        { success: false, message: "Missing required field: postTitle" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert copywriter and Reddit content creator. 
Paraphrase the following Reddit post to create a similar, engaging post suitable for the r/${subreddit || "general"} community.

Original Post Title: "${postTitle}"
Original Post Content: "${postSelftext || "(No body content)"}"

${additionalIdea ? `Additional angle/ideas to incorporate: "${additionalIdea}"` : ""}

Requirements:
- Create a fresh, attention-grabbing title.
- Rewrite the body content to be highly engaging, maintaining the style and formatting of popular posts in r/${subreddit || "general"} (e.g., proper spacing, line breaks, conversational tone).
- Output MUST be a valid JSON object matching the following structure:
{
  "title": "Generated Post Title",
  "body": "Generated Post Body"
}

Do not wrap your output in markdown code blocks like \`\`\`json. Return only the raw JSON.`;

    let success = false;
    let result: any = null;
    let errors: string[] = [];

    // 1. Try Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        console.log("Attempting generation with Gemini...");
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const responseText = response.text;
        if (responseText) {
          result = JSON.parse(responseText.trim());
          success = true;
          console.log("Generation with Gemini succeeded.");
        }
      } catch (err: any) {
        console.error("Gemini API attempt failed:", err);
        errors.push(`Gemini Error: ${err.message || err}`);
      }
    } else {
      errors.push("Gemini API key is not configured.");
    }

    // 2. Fallback to Groq API
    if (!success) {
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          console.log("Attempting generation with Groq...");
          const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama3-70b-8192",
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            throw new Error(`Groq HTTP error! status: ${groqResponse.status}, body: ${errText}`);
          }

          const data = await groqResponse.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            result = JSON.parse(content.trim());
            success = true;
            console.log("Generation with Groq succeeded.");
          } else {
            throw new Error("Empty message content received from Groq API.");
          }
        } catch (err: any) {
          console.error("Groq API attempt failed:", err);
          errors.push(`Groq Error: ${err.message || err}`);
        }
      } else {
        errors.push("Groq API key is not configured.");
      }
    }

    if (success && result) {
      return Response.json({
        success: true,
        title: result.title || "Untitled Paraphrased Post",
        body: result.body || "",
      });
    }

    // If both failed, return compiled errors
    return Response.json(
      { 
        success: false, 
        message: `Generation failed. Errors:\n- ${errors.join("\n- ")}` 
      },
      { status: 500 }
    );

  } catch (error: any) {
    console.error("AI Paraphrase General Handler Error:", error);
    return Response.json(
      { success: false, message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
