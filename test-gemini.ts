import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not configured.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_PROMPT = `You are an expert OVM (Orthogonal Variability Model) diagram generator. Your task is to convert natural language descriptions into a precise graph of nodes and edges.

## Node Types
- \`mandatory-vp\` — Mandatory Variation Point (always required in the product).
- \`optional-vp\` — Optional Variation Point (may or may not be included).
- \`variant\` — A concrete variant/option.

## Edge Types
- \`mandatory-line\` — Connects a VP to a mandatory variant.
- \`optional-line\` — Connects a VP to an optional variant.
- \`alternative-arc\` — Indicates an alternative choice constraint between variants. Must include a "label" indicating cardinality (e.g., "1..1", "1..*").
- \`requires-line\` — Indicates a requires dependency.
- \`excludes-line\` — Indicates mutual exclusion.

## Output Format
Return a JSON object with two arrays: "nodes" and "edges".
Each node must have a unique string "id" (e.g. "n1"), a "type", and a "label".
Each edge must have a "type", a "source" (node id), and a "target" (node id). It can also have an optional "label" (e.g., for cardinality).

Example:
{
  "nodes": [
    { "id": "vp1", "type": "mandatory-vp", "label": "Engine" },
    { "id": "v1", "type": "variant", "label": "Diesel" },
    { "id": "v2", "type": "variant", "label": "Petrol" }
  ],
  "edges": [
    { "type": "mandatory-line", "source": "vp1", "target": "v1" },
    { "type": "optional-line", "source": "vp1", "target": "v2" },
    { "type": "alternative-arc", "source": "v1", "target": "v2", "label": "1..1" }
  ]
}`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ['id', 'type', 'label'],
      },
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          source: { type: Type.STRING },
          target: { type: Type.STRING },
          label: { type: Type.STRING },
        },
        required: ['type', 'source', 'target'],
      },
    },
  },
  required: ['nodes', 'edges'],
};

async function run() {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Create a system with UI Framework (mandatory) having React and Vue as alternative options (1..1).',
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });
  console.log(response.text);
}
run().catch(console.error);
