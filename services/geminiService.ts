
import { GoogleGenAI, Type } from "@google/genai";

if (!process.env.API_KEY) {
  // In a real app, this would be handled more gracefully, maybe disabling the AI feature.
  console.error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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
