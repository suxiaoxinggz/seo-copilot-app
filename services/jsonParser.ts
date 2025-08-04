/**
 * Intelligently extracts a JSON object from a string, even if it's embedded in other text
 * like markdown code fences or explanatory text.
 * It also attempts to fix common syntax errors.
 * @param text The raw text string from the model response.
 * @returns The parsed JSON object.
 * @throws An error if a valid JSON object cannot be found or parsed.
 */
export function extractValidJSON(text: string): any {
  let jsonStr = text.trim();

  // 1. Try to extract from markdown code fences first. This is common.
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // 2. If no code block, find the first '{' or '[' and last '}' or ']'
    // This handles cases where the JSON is just embedded in text without fences.
    const firstBrace = jsonStr.indexOf('{');
    const firstBracket = jsonStr.indexOf('[');

    if (firstBrace === -1 && firstBracket === -1) {
      throw new Error("No JSON object or array found in the response.");
    }

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace === -1) throw new Error("Mismatched curly braces in JSON response.");
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    } else if (firstBracket !== -1) {
      const lastBracket = jsonStr.lastIndexOf(']');
      if (lastBracket === -1) throw new Error("Mismatched square brackets in JSON response.");
      jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
    }
  }


  // 3. Initial parse attempt
  try {
    return JSON.parse(jsonStr);
  } catch (initialError) {
    console.warn("Initial JSON.parse failed. Attempting to fix...", initialError);
    
    // 4. Attempt to fix common errors
    let fixedStr = jsonStr;

    // a) Remove trailing commas
    fixedStr = fixedStr.replace(/,\s*([}\]])/g, '$1');

    // b) Add quotes to unquoted keys (a common issue)
    // This regex is simplified and might not cover all cases, but handles many.
    fixedStr = fixedStr.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

    // c) Escape unescaped newlines within strings (crude but can help)
    fixedStr = fixedStr.replace(/"[^"]*"/g, (match) => {
        return match.replace(/\n/g, "\\n");
    });

    try {
      return JSON.parse(fixedStr);
    } catch (fixedError) {
      console.error("Failed to parse JSON even after attempting fixes.");
      console.error("Original Text:", text);
      console.error("Final Attempted String:", fixedStr);
      throw new Error(`JSON parsing failed: ${(fixedError as Error).message}. Please check the model's raw output.`);
    }
  }
}