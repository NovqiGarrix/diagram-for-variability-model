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

// ─── Response Schema for Structured Output ───────────────────────────────────

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      description: 'Array of nodes (shapes)',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Unique ID for the node' },
          type: {
            type: Type.STRING,
            description: 'Node type',
            enum: ['mandatory-vp', 'optional-vp', 'variant'],
          },
          label: { type: Type.STRING, description: 'Display label' },
        },
        required: ['id', 'type', 'label'],
      },
    },
    edges: {
      type: Type.ARRAY,
      description: 'Array of edges (lines connecting nodes)',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: 'Edge type',
            enum: [
              'mandatory-line',
              'optional-line',
              'alternative-arc',
              'requires-line',
              'excludes-line',
            ],
          },
          source: { type: Type.STRING, description: 'Source node ID' },
          target: { type: Type.STRING, description: 'Target node ID' },
          label: { type: Type.STRING, description: 'Label, strictly required for alternative-arc cardinality (e.g., "1..1"). Use empty string for other line types.' },
        },
        required: ['type', 'source', 'target', 'label'],
      },
    },
  },
  required: ['nodes', 'edges'],
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

    let parsed: {
      nodes: Array<{ id: string; type: string; label: string }>;
      edges: Array<{ type: string; source: string; target: string; label?: string }>;
    };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Failed to parse Gemini response as JSON. Please try again.');
    }

    if (!parsed.nodes || !parsed.edges) {
      throw new Error('Invalid response structure from Gemini. Please try again.');
    }

    const elements: Element[] = [];
    const idMap = new Map<string, string>();
    parsed.nodes.forEach((n) => idMap.set(n.id, generateId()));

    // Automatic Layout Engine
    const vps = parsed.nodes.filter((n) => n.type.includes('vp'));
    const variants = parsed.nodes.filter((n) => n.type === 'variant');

    // Group variants by parent VP
    const vpChildren = new Map<string, typeof variants>();
    vps.forEach((vp) => vpChildren.set(vp.id, []));

    parsed.edges.forEach((e) => {
      if ((e.type === 'mandatory-line' || e.type === 'optional-line') && vpChildren.has(e.source)) {
        const child = variants.find((v) => v.id === e.target);
        if (child) {
          vpChildren.get(e.source)!.push(child);
        }
      }
    });

    let currentX = 100;
    let currentY = 100;
    let maxRowHeight = 0;
    const shapeMap = new Map<string, Element>();

    // 1. Layout VPs and their children
    vps.forEach((vp) => {
      const children = vpChildren.get(vp.id)!;
      const vpWidth = 140;
      const vpHeight = 110;
      const variantWidth = 130;
      const variantHeight = 50;
      const spacing = 40;

      const totalChildrenWidth =
        children.length * variantWidth + Math.max(0, children.length - 1) * spacing;
      const groupWidth = Math.max(vpWidth, totalChildrenWidth);
      const groupHeight = vpHeight + 100 + variantHeight;

      // Wrap to next row if exceeding a typical screen width (e.g., 1200px)
      if (currentX + groupWidth > 1200 && currentX > 100) {
        currentX = 100;
        currentY += maxRowHeight + 80;
        maxRowHeight = 0;
      }

      maxRowHeight = Math.max(maxRowHeight, groupHeight);

      const vpCenterX = currentX + groupWidth / 2;

      const vpEl: Element = {
        id: idMap.get(vp.id)!,
        type: vp.type as any,
        label: vp.label,
        x1: vpCenterX - vpWidth / 2,
        y1: currentY,
        x2: vpCenterX + vpWidth / 2,
        y2: currentY + vpHeight,
      };
      elements.push(vpEl);
      shapeMap.set(vp.id, vpEl);

      let childX = vpCenterX - totalChildrenWidth / 2;
      children.forEach((child) => {
        const childEl: Element = {
          id: idMap.get(child.id)!,
          type: child.type as any,
          label: child.label,
          x1: childX,
          y1: currentY + vpHeight + 100,
          x2: childX + variantWidth,
          y2: currentY + vpHeight + 100 + variantHeight,
        };
        elements.push(childEl);
        shapeMap.set(child.id, childEl);
        childX += variantWidth + spacing;
      });

      currentX += groupWidth + 80;
    });

    // 2. Layout any floating variants
    let floatingX = 100;
    let floatingY = currentY + maxRowHeight + 80;
    if (vps.length === 0) floatingY = 100;

    variants.forEach((v) => {
      if (!shapeMap.has(v.id)) {
        if (floatingX + 130 > 1200) {
          floatingX = 100;
          floatingY += 100;
        }

        const vEl: Element = {
          id: idMap.get(v.id)!,
          type: v.type as any,
          label: v.label,
          x1: floatingX,
          y1: floatingY,
          x2: floatingX + 130,
          y2: floatingY + 50,
        };
        elements.push(vEl);
        shapeMap.set(v.id, vEl);
        floatingX += 170;
      }
    });

    // 3. Create edges with bindings
    parsed.edges.forEach((e) => {
      const sourceEl = shapeMap.get(e.source);
      const targetEl = shapeMap.get(e.target);

      if (sourceEl && targetEl) {
        let startAnchorX = 0.5;
        let startAnchorY = 1.0; // bottom center
        let endAnchorX = 0.5;
        let endAnchorY = 0.0; // top center

        // Adjust anchors for cross-cutting constraints
        if (e.type === 'requires-line' || e.type === 'excludes-line' || e.type === 'alternative-arc') {
          if (sourceEl.x1 < targetEl.x1) {
            startAnchorX = 1.0;
            startAnchorY = 0.5;
            endAnchorX = 0.0;
            endAnchorY = 0.5;
          } else {
            startAnchorX = 0.0;
            startAnchorY = 0.5;
            endAnchorX = 1.0;
            endAnchorY = 0.5;
          }
        }

        const edgeEl: Element = {
          id: generateId(),
          type: e.type as any,
          label: e.label || (e.type === 'alternative-arc' ? '1..1' : undefined),
          x1: sourceEl.x1 + (sourceEl.x2 - sourceEl.x1) * startAnchorX,
          y1: sourceEl.y1 + (sourceEl.y2 - sourceEl.y1) * startAnchorY,
          x2: targetEl.x1 + (targetEl.x2 - targetEl.x1) * endAnchorX,
          y2: targetEl.y1 + (targetEl.y2 - targetEl.y1) * endAnchorY,
          startBinding: {
            elementId: sourceEl.id,
            anchorX: startAnchorX,
            anchorY: startAnchorY,
          },
          endBinding: {
            elementId: targetEl.id,
            anchorX: endAnchorX,
            anchorY: endAnchorY,
          },
        };
        elements.push(edgeEl);
      }
    });

    return { elements };
  });
