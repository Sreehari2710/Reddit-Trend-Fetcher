import { type NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const { postTitle, postSelftext, subreddit, additionalIdea, previousTitle, previousBody } = await request.json();

    if (!postTitle) {
      return Response.json(
        { success: false, message: "Missing required field: postTitle" },
        { status: 400 }
      );
    }

    let prompt = "";
    if (previousTitle && previousBody) {
      // Refinement prompt: instructs AI to update already-generated version
      prompt = `You are an expert copywriter and Reddit content creator.
You previously generated a Reddit post for the r/${subreddit || "general"} community:

Previous Title: "${previousTitle}"
Previous Content: "${previousBody}"

The user wants to refine/update this post. Please modify the post by incorporating the following instructions/feedback:
"${additionalIdea || "Make minor refinements to improve engagingness"}"

Requirements:
- Incorporate the requested changes while keeping the rest of the post's tone, structure, and content as close to the previous version as possible.
- Output MUST be a valid JSON object matching the following structure:
{
  "title": "Refined Post Title",
  "body": "Refined Post Body"
}

Do not wrap your output in markdown code blocks like \`\`\`json. Return only the raw JSON.`;
    } else {
      // Initial paraphrase prompt
      prompt = `You are an expert copywriter and Reddit content creator. 
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
    }

    let success = false;
    let result: any = null;
    let errors: string[] = [];

    // 1. Try Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        console.log("Attempting generation with Gemini (REST API)...");
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(8000), // 8 seconds timeout
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini HTTP error! status: ${response.status}, body: ${errText}`);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (responseText) {
          result = JSON.parse(responseText.trim());
          success = true;
          console.log("Generation with Gemini succeeded.");
        } else {
          throw new Error("Empty text returned from Gemini API.");
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
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(8000), // 8 seconds timeout
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
