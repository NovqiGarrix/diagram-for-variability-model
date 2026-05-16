import { createServerFn } from '@tanstack/react-start';
import { GoogleGenAI, Type } from '@google/genai';
import type { Element } from '../types';
import { generateId } from '../utils/drawing';

// ─── Gemini Client (server-only) ─────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your API key to the .env file.',
    );
  }
  return new GoogleGenAI({ apiKey });
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert OVM (Orthogonal Variability Model) diagram generator. Your task is to convert natural language descriptions into precise OVM diagram element arrays.

## OVM Element Types

**Shapes (nodes):**
- \`mandatory-vp\` — Mandatory Variation Point (filled triangle with "VP" header). Always required in the product.
- \`optional-vp\` — Optional Variation Point (dashed triangle with "VP" header). May or may not be included.
- \`variant\` — A concrete variant/option (rectangle with "V" corner badge).

**Lines (connections):**
- \`mandatory-line\` — Solid line connecting a VP to a mandatory variant (must be selected).
- \`optional-line\` — Dashed line connecting a VP to an optional variant (may be selected).
- \`alternative-arc\` — Arc indicating alternative choice constraint between variants.
- \`requires-line\` — Dashed arrow indicating a requires dependency between elements.
- \`excludes-line\` — Dashed double-arrow indicating mutual exclusion between elements.

## Element Schema

Each element has:
- \`type\`: one of the types listed above
- \`x1, y1\`: top-left corner (for shapes) or start point (for lines)
- \`x2, y2\`: bottom-right corner (for shapes) or end point (for lines)
- \`label\`: display name (required for shapes, omit for lines)

## Layout Rules

1. Place the canvas origin at approximately (200, 100).
2. Variation Points (VPs) should be placed in a row at the top, spaced ~300px apart horizontally.
3. Each VP should be ~140px wide and ~110px tall.
4. Variants should be placed ~200px below their parent VP, spaced ~180px apart horizontally, centered under the VP.
5. Each Variant should be ~130px wide and ~50px tall.
6. Lines connect from the bottom-center of a VP to the top-center of a Variant.
7. For cross-cutting constraints (requires/excludes), draw lines between the relevant variants or VPs.
8. Keep all coordinates positive and reasonable (within 200-1600 x range, 100-800 y range).

## Connection Coordinate Rules

For lines connecting a VP to a Variant:
- The line's (x1, y1) should be the bottom-center of the VP: x1 = VP.x1 + (VP.x2 - VP.x1)/2, y1 = VP.y2
- The line's (x2, y2) should be the top-center of the Variant: x2 = V.x1 + (V.x2 - V.x1)/2, y2 = V.y1

## Output Format

Return ONLY a JSON object with an "elements" array. Place shapes first, then lines. Example:
{
  "elements": [
    { "type": "mandatory-vp", "x1": 200, "y1": 100, "x2": 340, "y2": 210, "label": "Engine" },
    { "type": "variant", "x1": 150, "y1": 310, "x2": 280, "y2": 360, "label": "Diesel" },
    { "type": "variant", "x1": 300, "y1": 310, "x2": 430, "y2": 360, "label": "Petrol" },
    { "type": "mandatory-line", "x1": 270, "y1": 210, "x2": 215, "y2": 310 },
    { "type": "optional-line", "x1": 270, "y1": 210, "x2": 365, "y2": 310 }
  ]
}`;

// ─── Response Schema for Structured Output ───────────────────────────────────

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    elements: {
      type: Type.ARRAY,
      description: 'Array of OVM diagram elements (shapes and lines)',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: 'Element type',
            enum: [
              'mandatory-vp',
              'optional-vp',
              'variant',
              'mandatory-line',
              'optional-line',
              'alternative-arc',
              'requires-line',
              'excludes-line',
            ],
          },
          x1: { type: Type.NUMBER, description: 'Start X or left X coordinate' },
          y1: { type: Type.NUMBER, description: 'Start Y or top Y coordinate' },
          x2: { type: Type.NUMBER, description: 'End X or right X coordinate' },
          y2: { type: Type.NUMBER, description: 'End Y or bottom Y coordinate' },
          label: { type: Type.STRING, description: 'Display label for shapes (omit for lines)' },
        },
        required: ['type', 'x1', 'y1', 'x2', 'y2'],
      },
    },
  },
  required: ['elements'],
};

// ─── Server Function ─────────────────────────────────────────────────────────

export const generateDiagram = createServerFn({ method: 'POST' })
  .inputValidator((input: { prompt: string }) => {
    if (!input.prompt || input.prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }
    if (input.prompt.length > 2000) {
      throw new Error('Prompt is too long (max 2000 characters)');
    }
    return { prompt: input.prompt.trim() };
  })
  .handler(async ({ data }) => {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: data.prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    let parsed: { elements: Array<Omit<Element, 'id'>> };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Failed to parse Gemini response as JSON. Please try again.');
    }

    if (!parsed.elements || !Array.isArray(parsed.elements)) {
      throw new Error('Invalid response structure from Gemini. Please try again.');
    }

    // Assign unique IDs to each element
    const elements: Element[] = parsed.elements.map((el) => ({
      ...el,
      id: generateId(),
    }));

    return { elements };
  });
