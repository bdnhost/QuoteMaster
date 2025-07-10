
import { GoogleGenAI, Type } from "@google/genai";

// In Vite, environment variables must be prefixed with VITE_
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("VITE_GEMINI_API_KEY environment variable not set. AI features will be disabled.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const itemsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "שם השירות או המוצר. לדוגמה: 'ניקיון יסודי למשרד', 'התקנת נקודת חשמל'."
      },
      quantity: {
        type: Type.INTEGER,
        description: "הכמות. לדוגמה: 1, 5, 10."
      },
      unitPrice: {
        type: Type.NUMBER,
        description: "המחיר ליחידה אחת בשקלים (₪), ללא מע'מ. לדוגמה: 500, 150.50."
      }
    },
    required: ["description", "quantity", "unitPrice"],
    propertyOrdering: ["description", "quantity", "unitPrice"]
  }
};


export const generateQuoteItems = async (prompt: string): Promise<Omit<{id: string, description: string, quantity: number, unitPrice: number }, 'id'>[]> => {
  try {
    if (!ai) {
      throw new Error("AI service not available. Please configure VITE_GEMINI_API_KEY.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `בהתבסס על הבקשה הבאה, צור רשימת פריטים להצעת מחיר. חשב מחירים הגיוניים בשקלים חדשים (ILS) לשוק הישראלי.
הבקשה: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: itemsSchema,
        systemInstruction: "אתה עוזר וירטואלי לעסקים קטנים בישראל, המתמחה ביצירת הצעות מחיר."
      },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        throw new Error("Gemini returned an empty response.");
    }
    
    const items = JSON.parse(jsonText);

    // Validate if the response is an array
    if (!Array.isArray(items)) {
        console.error("Parsed response is not an array:", items);
        throw new Error("AI response is not in the expected format (array).");
    }

    return items;
  } catch (error) {
    console.error("Error generating quote items with Gemini:", error);
    throw new Error("נכשל ביצירת פריטים בעזרת AI. נסה שוב או הוסף פריטים ידנית.");
  }
};
