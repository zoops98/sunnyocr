
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { OCR_SYSTEM_PROMPT, SUMMARY_PROMPT, CORRECTION_PROMPT } from "../constants";

// Create a new instance right before use to ensure it uses the latest API key
const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const performOCR = async (
  base64Data: string,
  mimeType: string,
  highAccuracy: boolean
): Promise<string> => {
  const ai = getAIClient();
  const model = "gemini-3-pro-preview";

  const prompt = highAccuracy 
    ? "Perform high-accuracy OCR on this document. Focus on precise text, tables, and math formulas."
    : "Extract all text from this document, maintaining layout.";

  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      systemInstruction: OCR_SYSTEM_PROMPT,
      temperature: highAccuracy ? 0.1 : 0.4,
    }
  });

  return response.text || "";
};

export const refineText = async (text: string, mode: 'summary' | 'correction'): Promise<string> => {
  const ai = getAIClient();
  const model = "gemini-3-flash-preview";
  
  const instruction = mode === 'summary' ? SUMMARY_PROMPT : CORRECTION_PROMPT;
  
  const response: GenerateContentResponse = await ai.models.generateContent({
    model,
    contents: instruction + "\n\nContent:\n" + text,
    config: {
      temperature: 0.3,
    }
  });

  return response.text || "";
};
