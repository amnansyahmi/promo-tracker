import { GoogleGenAI, Type } from '@google/genai';

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

export const extractPromoDetails = async (text: string, url: string, imageUrl: string) => {
  const ai = getGeminiClient();
  const prompt = `
    You are a highly efficient assistant for a "Promotion & Contest Discovery" app.
    Extract detailed promotion information from the provided content (text, URL, or image).
    
    Content Source: ${url || 'User Input'}
    Text Content: ${text || 'Not provided'}
    
    Rules:
    - If dates are missing, use null.
    - Focus on Malaysian context.
    - For images, strictly extract the visible text.
  `;

  let contents: any[] = [prompt];

  if (imageUrl) {
    try {
      const fetchResponse = await fetch(imageUrl);
      const buffer = await fetchResponse.arrayBuffer();
      // NOTE: arrayBuffer to base64 browser equivalent
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      contents.push({
        inlineData: {
          data: btoa(binary),
          mimeType: 'image/jpeg' 
        }
      });
    } catch (imgError) {
      console.error("Could not fetch image for AI:", imgError);
    }
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          brand_name: { type: Type.STRING },
          promo_type: { type: Type.STRING },
          category: { type: Type.STRING },
          country: { type: Type.STRING },
          source_url: { type: Type.STRING },
          start_date: { type: Type.STRING },
          end_date: { type: Type.STRING },
          reward_title: { type: Type.STRING },
          how_to_join_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          terms_and_conditions_summary: { type: Type.ARRAY, items: { type: Type.STRING } },
          cost_level: { type: Type.STRING },
          difficulty_level: { type: Type.STRING },
          tips_to_win: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence_score: { type: Type.NUMBER }
        }
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const discoverPromosAI = async (query: string) => {
  const ai = getGeminiClient();
  const prompt = `
    Search for active promotions and deals in Malaysia based on: "${query}".
    Find 5-10 active deals.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            brand_name: { type: Type.STRING },
            promo_type: { type: Type.STRING },
            category: { type: Type.STRING },
            source_url: { type: Type.STRING },
            end_date: { type: Type.STRING },
            reward_title: { type: Type.STRING },
            confidence_score: { type: Type.NUMBER }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};