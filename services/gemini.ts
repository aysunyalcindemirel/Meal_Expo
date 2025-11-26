import { GoogleGenAI, Type } from "@google/genai";
import { Meal } from "../types";

// NOTE: We have removed the manual 'declare const process' block here because 
// it is now handled by @types/node in package.json. Keeping it would cause a crash.

// Initialize the client
// We use 'as string' to satisfy TypeScript that the key is not undefined
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Schema for structured JSON output
const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: "The name of the dish. Be creative but clear.",
    },
    description: {
      type: Type.STRING,
      description: "A mouth-watering description of the meal (1-2 sentences).",
    },
    cuisine: {
      type: Type.STRING,
      description: "The cuisine type (e.g., Italian, Japanese, Fusion).",
    },
    prepTime: {
      type: Type.STRING,
      description: "Estimated preparation and cooking time (e.g., '30 mins').",
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of ingredients with quantities.",
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Step-by-step cooking instructions.",
    },
    calories: {
      type: Type.INTEGER,
      description: "Approximate calories per serving.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 descriptive tags (e.g., 'Spicy', 'Vegetarian', 'Quick').",
    }
  },
  required: ["name", "description", "cuisine", "prepTime", "ingredients", "instructions", "tags"],
};

export const generateMealSuggestion = async (
  exclusionList: string[] = []
): Promise<Omit<Meal, 'id' | 'createdAt' | 'source'>> => {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    Suggest a unique, delicious, and practical meal for me to cook or eat.
    It should be diverse and not repetitive.
    ${exclusionList.length > 0 ? `Avoid suggesting these recent meals: ${exclusionList.slice(-5).join(', ')}.` : ''}
    Focus on appetizing flavor combinations.
    Include a detailed recipe with ingredients and step-by-step instructions.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: mealSchema,
        systemInstruction: "You are a world-class chef and nutritionist designed to suggest inspiring meals.",
        temperature: 1.2, // Higher temperature for more variety
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Error generating meal:", error);
    throw error;
  }
};

export const generateMealImage = async (mealName: string, mealDescription: string): Promise<string | undefined> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Professional food photography of ${mealName}. ${mealDescription}. High resolution, appetizing, studio lighting, 4k.`,
          },
        ],
      },
      config: {
        // Image generation doesn't use standard config like temperature in the same way,
        // but often defaults are fine.
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    return undefined;
  } catch (error) {
    console.error("Error generating image:", error);
    // Return undefined to allow fallback to placeholder
    return undefined; 
  }
};
