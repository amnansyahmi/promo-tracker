import { GoogleGenAI, Type } from '@google/genai';

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

export const extractPromoDetails = async (text: string, url: string, imageUrls: string[]) => {
  const ai = getGeminiClient();
  
  // Step 1: Research and Grounding
  const isSocialMedia = url.includes('instagram.com') || url.includes('tiktok.com') || url.includes('facebook.com');
  
  const researchPrompt = `
    You are an expert researcher for a "Promotion & Contest Discovery" app in Malaysia.
    Your task is to gather high-fidelity, accurate information about a promotion based on the provided source URL, text, or media.
    
    CRITICAL INSTRUCTIONS:
    - The Source URL: ${url || 'Not provided'}
    - Text Content Excerpt: ${text || 'Not provided'}
    
    ${isSocialMedia ? `
    - THIS IS A SOCIAL MEDIA LINK (${url}). These links often lead to login walls for automated scrapers. 
    - DO NOT rely on the "Text Content Excerpt" if it looks like a login page or generic metadata (e.g., "Instagram", "Login • Instagram").
    - INSTEAD, USE THE GOOGLE SEARCH TOOL to search for the specific brand and promotion mentioned in the URL or the provided text.
    - IMPORTANT: Ensure the search results you find are for the EXACT SAME CAMPAIGN as intended by the user. Match the Brand, Campaign Name, and timeframe.
    - VERIFY ACTIVE STATUS: Check if the promotion is still active in Malaysia. If it has ended, mark it as "Ended/Expired" in your report.
    - Find the OFFICIAL CAMPAIGN LANDING PAGE or the official Terms & Conditions (T&C) on the brand's website.
    - DO NOT HALLUCINATE: If a link doesn't match perfectly, say "Unable to verify this specific link".
    ` : ''}

    - PROHIBITED: Do not use dummy data like "Brand Name: Instagram" or "Title: Contest". 
    - PROHIBITED: Do not use common placeholders like "RM1,000" or "End Date: 2024-12-31" unless specifically found.
    - If you cannot find a specific end date, prize, or brand name, state "Unknown" or "Needs manual verification". 
    - Extract SPECIFIC prizes (e.g., "iPhone 15 Pro Max 256GB", "Grand Prize: RM10,000 Cash").
    - If images or videos are provided, they are attached. EXHAUSTIVELY extract every detail from them.
    
    Research for:
    1. Brand Name (e.g., Nestlé, Shell, Shopee) and Official Campaign Title.
    2. Promotion Type (Contest, Giveaway, Buy & Win, Instant Discount, etc.).
    3. Start and End Dates (Must be active in Malaysia).
    4. Prize Breakdown (Be as granular as possible, e.g. "Weekly Prize: 10x RM100 Grab Voucher").
    5. How to Join (Precise, numbered steps).
    6. QR code URL or data if visible in the media.
    7. Terms and Conditions (Find the actual official T&C link).
    
    If you find that the information is NOT RETRIEVABLE due to a login wall or lack of indexing, clearly state in your report: "This link is restricted. Please provide a screenshot or paste the caption text for better extraction."
    
    Provide a detailed, high-fidelity research report based ONLY on verifiable facts found via Search or Media.
  `;

  let researchContents: any[] = [researchPrompt];

  if (imageUrls && imageUrls.length > 0) {
    for (const imgUri of imageUrls) {
      if (!imgUri) continue;
      try {
        const mimeType = imgUri.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
        const fetchResponse = await fetch(imgUri);
        const buffer = await fetchResponse.arrayBuffer();
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        researchContents.push({
          inlineData: {
            data: btoa(binary),
            mimeType: mimeType
          }
        });
      } catch (imgError) {
        console.error("Could not fetch media for research:", imgError);
      }
    }
  }

  const researchResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: researchContents,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const researchReport = researchResponse.text || "No research findings.";

  // Step 2: Format to JSON
  const formatPrompt = `
    Convert the following research report into a structured JSON object.
    
    Research Report:
    ${researchReport}
    
    Rules:
    - Dates must be in YYYY-MM-DD format. Use null if unknown.
    - Default country is Malaysia.
    - confidence_score should reflect how much detail was found (0-100).
  `;

  const formatResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: formatPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          brand_name: { type: Type.STRING },
          promo_type: { type: Type.STRING },
          category: { type: Type.STRING },
          country: { type: Type.STRING },
          source_url: { type: Type.STRING },
          start_date: { type: Type.STRING },
          end_date: { type: Type.STRING },
          reward_title: { type: Type.STRING },
          prizes: { type: Type.ARRAY, items: { type: Type.STRING } },
          how_to_join_steps: { type: Type.ARRAY, items: { type: Type.STRING } },
          qr_code_data: { type: Type.STRING },
          terms_and_conditions_summary: { type: Type.ARRAY, items: { type: Type.STRING } },
          cost_level: { type: Type.STRING },
          difficulty_level: { type: Type.STRING },
          tips_to_win: { type: Type.ARRAY, items: { type: Type.STRING } },
          confidence_score: { type: Type.NUMBER }
        }
      }
    }
  });

  return JSON.parse(formatResponse.text || '{}');
};

export const discoverPromosAI = async (query: string) => {
  const ai = getGeminiClient();
  const prompt = `
    Use the Google Search tool to search for active promotions and deals in Malaysia based on: "${query}".
    Find 5-10 active deals with accurate links and dates.
    
    Output the results as a JSON array of objects with these fields:
    - title (string)
    - brand_name (string) 
    - promo_type (string)
    - category (string)
    - source_url (string)
    - end_date (string or null)
    - reward_title (string)
    - confidence_score (number)

    Return ONLY the raw JSON array.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  const text = response.text || '[]';
  // Attempt to extract JSON if there's markdown wrapping
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[0] : text;

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse discover AI response:", e);
    return [];
  }
};