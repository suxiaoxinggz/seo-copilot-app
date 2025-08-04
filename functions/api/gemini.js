// functions/api/gemini.js (修正后)

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const { prompt, modelId } = await request.json();

    // 修正: 寻找一个更明确的密钥名称
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Gemini API key is not configured on the server. Please set the GEMINI_API_KEY environment variable.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ... (其他代码无需修改) ...

    // 修正: 使用与上面检查时相同的密钥名称
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${env.GEMINI_API_KEY}`;

    // ... (文件的其余部分代码都很好，无需修改) ...
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const apiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        const errorMessage = errorBody?.error?.message || `Google API request failed with status ${apiResponse.status}`;
        return new Response(JSON.stringify({ error: errorMessage }), { status: apiResponse.status });
    }

    const data = await apiResponse.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return new Response(JSON.stringify({ text }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
