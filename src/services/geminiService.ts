import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getCulturalRecommendation(genres: string[], answers: Record<string, number>) {
  try {
    const prompt = `
      You are a futuristic AI cultural concierge for "VanBeresteyn", a cultural center.
      The user is interested in these genres: ${genres.join(", ")}.
      Their preferences (on a scale 0-100) are:
      ${Object.entries(answers).map(([q, v]) => `- ${q}: ${v}`).join("\n")}

      Based on this, generate:
      1. A personalized cinematic greeting.
      2. 3 Movie recommendations (title + short futuristic description).
      3. 2 Cultural events or workshop suggestions at VanBeresteyn.
      4. 1 Immersive "Future Vision" experiment.

      Make the tone poetic, cinematic, and futuristic. Use Markdown for formatting.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The stars are misaligned. I cannot see your future right now. Please try again when the signal is stronger.";
  }
}
