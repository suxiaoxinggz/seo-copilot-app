import { KeywordMap, Model, ApiProvider } from '../types';
import { extractValidJSON } from './jsonParser';
import { SEO_PROMPT_TEMPLATE, LSI_GENERATION_PROMPT_TEMPLATE, ARTICLE_PROMPT_TEMPLATE, TRANSLATE_PROMPT_TEMPLATE, BATCH_TRANSLATE_PROMPT_TEMPLATE } from '../constants';
import { SignJWT } from 'jose';

// --- Zhipu AI V4 API Implementation ---

const ZHIPU_API_ENDPOINT = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
let zhipuTokenCache = { token: '', expiry: 0 };

/**
 * Generates a JWT for Zhipu AI API authentication, with caching.
 * @param apiKey The Zhipu API key in "id.secret" format.
 * @returns A promise that resolves to the Bearer token.
 */
async function generateZhipuToken(apiKey: string): Promise<string> {
    if (zhipuTokenCache.expiry > Date.now()) {
        return zhipuTokenCache.token;
    }

    const [id, secret] = apiKey.split('.');
    if (!id || !secret) {
        throw new Error('Invalid Zhipu API Key format. Expected "id.secret".');
    }

    const now = Date.now();
    const expiry = now + 23 * 60 * 60 * 1000; // 23 hours

    const token = await new SignJWT({ api_key: id, exp: expiry, timestamp: now })
        .setProtectedHeader({ alg: 'HS256', sign_type: 'SIGN' })
        .sign(new TextEncoder().encode(secret));
    
    zhipuTokenCache = { token, expiry };
    return token;
}

async function callZhipuApi(prompt: string, model: Model): Promise<string> {
    const token = await generateZhipuToken(model.apiKey);

    const body = {
        model: model.id,
        messages: [{ role: 'user', content: prompt }],
    };

    const response = await fetch(ZHIPU_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Zhipu API Error:', errorBody);
        throw new Error(`Zhipu API request failed with status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
        console.error('Invalid response structure from Zhipu API:', data);
        throw new Error('Received an invalid or empty response from the Zhipu API.');
    }

    return data.choices[0].message.content;
}

// --- Google Gemini API Implementation ---

async function callGeminiApi(prompt: string, model: Model): Promise<string> {
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, modelId: model.id }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Gemini proxy request failed with status ${response.status}`);
        }
        
        if (data.text === undefined || data.text === null) {
             console.error('Invalid response structure from Gemini proxy:', data);
             throw new Error('Received an invalid or empty response from the Gemini proxy.');
        }

        return data.text;

    } catch (error) {
        console.error('Gemini Proxy Error:', error);
        throw new Error(`Gemini request failed via proxy: ${(error as Error).message}`);
    }
}


// --- MOCK DATA ---
const MOCK_KEYWORD_MAP_RESPONSE = `
  {
    "coreUserIntent": "Users are seeking comprehensive information and purchasing options for high-quality, stylish, and comfortable bedding sets (Mock Data).",
    "originalKeywords": { "traffic": ["vividcozy bedding"], "comparison": [], "conversion": [] },
    "keywordHierarchy": [
      {
        "keyword": "eco-friendly bedding (Mock)",
        "type": "引流型", "pageType": "文章类",
        "children": [
          { "keyword": "what is organic cotton", "type": "认知型 (Awareness)", "lsi": ["organic cotton definition", "is organic cotton soft", "benefits of organic cotton", "organic cotton vs regular cotton", "best organic cotton sheets"] },
          { "keyword": "bamboo vs linen sheets", "type": "决策型 (Decision)", "lsi": ["bamboo sheets pros and cons", "linen sheets durability", "bamboo vs linen cooling", "which is softer bamboo or linen", "cost of bamboo vs linen"] }
        ]
      }
    ]
  }
`;

const MOCK_LSI_RESPONSE = `
  ["mock lsi 1", "mock lsi 2", "mock lsi 3", "mock lsi 4", "mock lsi 5", "mock lsi 6", "mock lsi 7", "mock lsi 8", "mock lsi 9", "mock lsi 10"]
`;

const MOCK_ARTICLE_RESPONSE = `
# The Ultimate Guide to Eco-Friendly Bedding (Mock Article)

In today's world, making sustainable choices is more important than ever, and that extends to the place we spend a third of our lives: our bed. Eco-friendly bedding is not just a trend; it's a commitment to better health and a healthier planet.

## What is Organic Cotton?

Let's start with the basics. **Organic cotton** is grown without the use of harmful pesticides or synthetic fertilizers. This means cleaner water, richer soil, and safer products for farmers and consumers. When you choose organic cotton sheets, you're choosing a fabric that is naturally soft, breathable, and hypoallergenic. The benefits of organic cotton are clear: it's gentle on your skin and the environment.

## Bamboo vs. Linen Sheets: The Great Debate

When it comes to sustainable fabrics, bamboo and linen are top contenders. But which is right for you?

### Bamboo Sheets: Pros and Cons
*   **Pros:** Incredibly soft, thermo-regulating (keeps you cool), and moisture-wicking.
*   **Cons:** Can be less durable than other fabrics if not cared for properly.

### Linen Sheets: A Durable Choice
*   **Pros:** Extremely durable (gets softer with every wash), highly breathable, and has a classic, rustic look.
*   **Cons:** Can feel coarse initially and is prone to wrinkling.

Ultimately, the choice between bamboo vs linen cooling properties and softness comes down to personal preference.
`;


// --- UNIFIED API FUNCTIONS ---

export const generateKeywordMap = async (initialKeywords: string, extraInstructions: string, model: Model, promptTemplate: string = SEO_PROMPT_TEMPLATE): Promise<KeywordMap> => {
  console.log(`Generating Keyword Map using ${model.apiProvider} provider with model ${model.id}`);
  
  const prompt = promptTemplate
    .replace('{initialKeywords}', initialKeywords)
    .replace('{extraInstructions}', extraInstructions || 'None');
  
  try {
    let rawResponse: string;
    if (model.apiProvider === ApiProvider.ZHIPU) {
        rawResponse = await callZhipuApi(prompt, model);
    } else if (model.apiProvider === ApiProvider.GEMINI) {
        rawResponse = await callGeminiApi(prompt, model);
    } else {
        // Fallback to mock for other providers for now
        await new Promise(resolve => setTimeout(resolve, 2500));
        rawResponse = MOCK_KEYWORD_MAP_RESPONSE;
    }
    const parsedData = extractValidJSON(rawResponse);
    return parsedData as KeywordMap;
  } catch (error) {
    console.error("Failed to generate and parse keyword map:", error);
    throw error;
  }
};

export const generateLsiForNode = async (
    context: {
        initialKeywords: string;
        originalPrompt: string;
        level1Keyword: string;
        level1Type: string;
        level2Keyword: string;
        level2Type: string;
        existingLSI: string[];
    },
    model: Model
): Promise<string[]> => {
    console.log(`Generating LSI using ${model.apiProvider} provider with model ${model.id}`);

    const prompt = LSI_GENERATION_PROMPT_TEMPLATE
        .replace(/{level2Keyword}/g, context.level2Keyword)
        .replace('{initialKeywords}', context.initialKeywords)
        .replace('{originalPrompt}', context.originalPrompt || 'None')
        .replace('{level1Keyword}', context.level1Keyword)
        .replace('{level1Type}', context.level1Type)
        .replace('{level2Type}', context.level2Type)
        .replace('{existingLSI}', context.existingLSI.join(', ') || 'None');

    try {
        let rawResponse: string;
        if (model.apiProvider === ApiProvider.ZHIPU) {
            rawResponse = await callZhipuApi(prompt, model);
        } else if (model.apiProvider === ApiProvider.GEMINI) {
            rawResponse = await callGeminiApi(prompt, model);
        }
        else {
            // Fallback to mock
            await new Promise(resolve => setTimeout(resolve, 1500));
            rawResponse = MOCK_LSI_RESPONSE.replace(/{level2Keyword}/g, context.level2Keyword);
        }
        
        const parsedData = extractValidJSON(rawResponse);
        if (!Array.isArray(parsedData) || !parsedData.every(item => typeof item === 'string')) {
            throw new Error("Model returned data that is not a string array.");
        }
        return parsedData as string[];
    } catch(error) {
        console.error("Failed to generate and parse LSI keywords:", error);
        throw error;
    }
};

export const generateArticle = async (keywordContext: string, model: Model, promptTemplate: string): Promise<string> => {
    console.log(`Generating Article using ${model.apiProvider} provider with model ${model.id}`);

    const prompt = promptTemplate.replace('{keywordContext}', keywordContext);
    
    try {
        if (model.apiProvider === ApiProvider.ZHIPU) {
            return await callZhipuApi(prompt, model);
        } else if (model.apiProvider === ApiProvider.GEMINI) {
            return await callGeminiApi(prompt, model);
        } else {
            // Fallback to mock
            await new Promise(resolve => setTimeout(resolve, 3000));
            return MOCK_ARTICLE_RESPONSE;
        }
    } catch (error) {
        console.error("Failed to generate article:", error);
        throw error;
    }
};

export const translateText = async (textToTranslate: string, model: Model): Promise<string> => {
    console.log(`Translating text using ${model.apiProvider} provider with model ${model.id}`);
    
    const prompt = TRANSLATE_PROMPT_TEMPLATE.replace('{textToTranslate}', textToTranslate);

    try {
        if (model.apiProvider === ApiProvider.ZHIPU) {
            return await callZhipuApi(prompt, model);
        } else if (model.apiProvider === ApiProvider.GEMINI) {
            return await callGeminiApi(prompt, model);
        } else {
            // Fallback to mock for other providers
            await new Promise(resolve => setTimeout(resolve, 1000));
            return `[模拟中文翻译]: 这是对以下内容的模拟翻译：\n\n${textToTranslate.substring(0, 200)}...`;
        }
    } catch (error) {
        console.error("Failed to translate text:", error);
        throw error;
    }
};

export const translateBatch = async (texts: string[], model: Model): Promise<Record<string, string>> => {
    console.log(`Batch translating ${texts.length} texts using ${model.apiProvider} provider with model ${model.id}`);
    if (texts.length === 0) return {};

    const jsonStringArray = JSON.stringify(texts);
    const prompt = BATCH_TRANSLATE_PROMPT_TEMPLATE.replace('{jsonStringArray}', jsonStringArray);

    try {
        let rawResponse: string;
        if (model.apiProvider === ApiProvider.ZHIPU) {
            rawResponse = await callZhipuApi(prompt, model);
        } else if (model.apiProvider === ApiProvider.GEMINI) {
            rawResponse = await callGeminiApi(prompt, model);
        } else {
            // Mock response for batch translation
            await new Promise(resolve => setTimeout(resolve, 1500));
            const mockTranslations = texts.reduce((acc, text) => {
                acc[text] = `[中] ${text}`;
                return acc;
            }, {} as Record<string, string>);
            rawResponse = JSON.stringify(mockTranslations);
        }
        
        const parsedData = extractValidJSON(rawResponse);
        if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
            throw new Error("Model returned data that is not a JSON object.");
        }
        return parsedData as Record<string, string>;
    } catch(error) {
        console.error("Failed to batch translate and parse:", error);
        throw error;
    }
};