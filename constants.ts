import { Model, ModelProvider, ApiProvider } from './types';

export const PRESET_MODELS: Model[] = [
  {
    id: 'gemini-2.5-flash',
    nickname: 'Google Gemini (gemini-2.5-flash)',
    apiKey: '', // Key is handled server-side
    supportsWebSearch: true,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.GEMINI,
  },
  {
    id: 'glm-4-flash',
    nickname: '智谱 AI (glm-4-flash)',
    apiKey: '', // User must provide their own key
    supportsWebSearch: true,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.ZHIPU,
  },
  {
    id: 'glm-4-air',
    nickname: '智谱 AI (glm-4-air)',
    apiKey: '', // User must provide their own key
    supportsWebSearch: true,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.ZHIPU,
  },
  {
    id: 'llama-3-70b',
    nickname: 'Llama 3 (70B-Instruct)',
    apiKey: '', // User must provide their own key
    supportsWebSearch: false,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.MOCK,
  },
   {
    id: 'gpt-4o',
    nickname: 'OpenAI GPT-4o',
    apiKey: '', // User must provide their own key
    supportsWebSearch: true,
    type: ModelProvider.PRESET,
    apiProvider: ApiProvider.MOCK,
  },
];

export const SEO_PROMPT_TEMPLATE = `
You are a 15-year SEO strategist. Your task is to analyze initial keywords for my site "vividcozy" and build a multi-level SEO topic map. Follow these 5 steps strictly, using the specified JSON output format. Ensure all keywords are unique and natural for US users.

**Step 1: Analyze User Persona & Search Intent**
Analyze the provided keywords to understand the user persona (e.g., essential need, decision-making) and search intent (e.g., informational, high conversion).

**Step 2: Classify Core Search Intent**
Summarize the core user intent in one sentence. Then, classify the original keywords into three categories: Traffic-driving, Comparison, and Conversion.

**Step 3: Generate Core Keywords for Different Page Types**
For each category from Step 2, create 3 new core keywords, one for each of these page types: "产品详情类", "文章类", and "聚合类". This will result in 9 unique core keywords.

**Step 4: Create a Three-Level Topic Map**
For each of the 9 core keywords generated in Step 3, create a three-level map:
- **Level 1:** The core keyword itself.
- **Level 2:** Derive 4 sub-core keywords based on user behavior stages: Awareness, Decision, Trust, and Action.
- **Level 3:** For EACH Level 2 sub-core keyword, generate at least 10 LSI (Latent Semantic Indexing) keywords (related terms, synonyms, long-tail questions). These must be tightly related to their parent Level 2 keyword.

**Step 5: Ensure Quality & Uniqueness**
- **No Duplicates:** All generated keywords (Levels 1, 2, and 3) must be unique across the entire output.
- **Natural Language:** Keywords must align with natural user search behavior in the US.
- **Logical Hierarchy:** Ensure Level 3 supports Level 2, and Level 2 supports Level 1, creating a cohesive semantic structure.

**INPUT KEYWORDS:**
---
{initialKeywords}
---

**ADDITIONAL INSTRUCTIONS:**
---
{extraInstructions}
---

**OUTPUT FORMAT:**
You MUST return ONLY a single, valid JSON object that adheres to the following structure. Do not include any explanatory text, markdown formatting, or anything outside of the JSON object.

\`\`\`json
{
  "coreUserIntent": "A one-sentence summary of the core user intent.",
  "originalKeywords": {
    "traffic": ["keyword1", "keyword2"],
    "comparison": ["keyword3", "keyword4"],
    "conversion": ["keyword5", "keyword6"]
  },
  "keywordHierarchy": [
    {
      "keyword": "Level 1 Core Keyword 1",
      "type": "引流型",
      "pageType": "文章类",
      "children": [
        {
          "keyword": "Level 2 - Awareness Keyword",
          "type": "认知型 (Awareness)",
          "lsi": ["lsi_term_1", "lsi_term_2", "..."]
        },
        {
          "keyword": "Level 2 - Decision Keyword",
          "type": "决策型 (Decision)",
          "lsi": ["lsi_term_1", "lsi_term_2", "..."]
        },
        {
          "keyword": "Level 2 - Trust Keyword",
          "type": "信任型 (Trust)",
          "lsi": ["lsi_term_1", "lsi_term_2", "..."]
        },
        {
          "keyword": "Level 2 - Action Keyword",
          "type": "行动型 (Action)",
          "lsi": ["lsi_term_1", "lsi_term_2", "..."]
        }
      ]
    }
  ]
}
\`\`\`
IMPORTANT: You must generate the full hierarchy for all 9 core keywords. Do not use placeholders or omit any sections. The final output must be a complete JSON object as specified.
`;

export const LSI_GENERATION_PROMPT_TEMPLATE = `
Based on the following context, generate additional LSI semantic keywords for the Level 2 keyword "{level2Keyword}".

**Context:**
1.  **Initial Keywords:** {initialKeywords}
2.  **Original User Instructions:** {originalPrompt}
3.  **Parent Level 1 Keyword:** "{level1Keyword}" (Type: {level1Type})
4.  **Target Level 2 Keyword Type:** {level2Type}
5.  **Existing LSI Keywords (do not repeat):** {existingLSI}

**Requirements:**
- Generate at least 10 new LSI keywords highly relevant to "{level2Keyword}".
- The new keywords must be unique and not present in the existing LSI list or the parent keywords.
- Output ONLY a valid JSON array of strings, with no additional text or explanation.

**Example Output:**
\`\`\`json
["new lsi keyword 1", "new lsi keyword 2", "new lsi keyword 3"]
\`\`\`
`;

export const ARTICLE_PROMPT_TEMPLATE = `
You are an expert SEO content writer. Your task is to write a comprehensive, engaging, and well-structured article based on the provided keyword context.

**Instructions:**
1.  **Analyze the Context:** Deeply understand the provided keywords, including the core keywords, sub-core keywords, their types (e.g., Awareness, Decision), page type, and LSI terms.
2.  **Structure the Article:** Create a logical flow with a compelling introduction, a body that addresses the keyword themes, and a strong conclusion. Use headings (H2, H3) to break up the content.
3.  **Incorporate Keywords Naturally:** Weave the provided core, sub-core, and LSI keywords throughout the article. Do not "stuff" keywords. The language should be fluent and natural for a human reader.
4.  **Match Intent:** The tone and content should match the user intent identified in the keyword context (e.g., informational content for "Awareness" keywords, persuasive content for "Decision" keywords).
5.  **Output:** Write the complete article in English.

**KEYWORD CONTEXT:**
---
{keywordContext}
---

Begin writing the article now.
`;

export const TRANSLATE_PROMPT_TEMPLATE = `
As an expert translator, your sole task is to translate the following English text into natural, fluent Chinese.

**CRITICAL INSTRUCTIONS:**
- Your response MUST contain ONLY the Chinese translation.
- DO NOT include any preamble, explanations, annotations, thought processes (like "<think>...</think>"), or the original English text.
- The output should be ready for direct use, without any extra formatting or text.

**ENGLISH TEXT TO TRANSLATE:**
---
{textToTranslate}
---

**CHINESE TRANSLATION ONLY:**
`;

export const BATCH_TRANSLATE_PROMPT_TEMPLATE = `
As an expert translator, your sole task is to translate the following JSON array of English terms into natural, fluent Chinese.

**CRITICAL INSTRUCTIONS:**
- Your response MUST be ONLY a single, valid JSON object.
- The JSON object should map each original English term to its Chinese translation.
- DO NOT include any preamble, explanations, annotations, or any text outside of the JSON object.
- If a term cannot be translated or is a name, return the original term as the value.

**INPUT JSON ARRAY OF STRINGS:**
---
{jsonStringArray}
---

**OUTPUT JSON OBJECT (key: English, value: Chinese):**
`;