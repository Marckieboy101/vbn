import { GoogleGenAI, Type } from "@google/genai";

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
      model: "gemini-3.5-flash",
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The stars are misaligned. I cannot see your future right now. Please try again when the signal is stronger.";
  }
}

export interface ModerationResult {
  refinedText: string;
  toxic: boolean;
  blockedWordsDetected: string[];
  language: string;
}

export async function moderateAndRefineSpeech(text: string, customWords: string[]): Promise<ModerationResult> {
  try {
    const prompt = `
      You are an expert AI speech transcriber and toxic language content moderator.
      Review the following transcribed message spoken by a visitor:
      "${text}"

      Please perform two tasks:
      1. Refine the speech: Fix obvious grammatical glitches, capitalize properly, add logical punctuation, and strip out redundant filler words (such as "uhm", "uh", "eh", "ah", "you know") while keeping the speaker's original meaning intact.
      2. Content Moderation: Detect if the text contains severe curse words, hate speech, explicit profanities, or threat elements. Also cross-reference these custom blocked words provided by the operator: ${customWords.length > 0 ? customWords.join(", ") : "none"}.
         If any swear, offensive, or custom blocked words are found, flag them in the "blockedWordsDetected" output list.

      Provide your review securely in the specified JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedText: {
              type: Type.STRING,
              description: "The refined transcription, removing filler words and perfecting punctuation."
            },
            toxic: {
              type: Type.BOOLEAN,
              description: "Whether the text continues to contain explicit profanity, hate/harmful speech, or custom blocked words."
            },
            blockedWordsDetected: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of identified curse, offensive, or custom blocked words."
            },
            language: {
              type: Type.STRING,
              description: "The primary language detected, such as 'Dutch', 'English', 'French', etc."
            }
          },
          required: ["refinedText", "toxic", "blockedWordsDetected", "language"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as ModerationResult;
    }
    
    return {
      refinedText: text,
      toxic: false,
      blockedWordsDetected: [],
      language: "Unknown"
    };
  } catch (error) {
    console.error("Gemini Speech Moderation Error:", error);
    return {
      refinedText: text,
      toxic: false,
      blockedWordsDetected: [],
      language: "NL"
    };
  }
}
