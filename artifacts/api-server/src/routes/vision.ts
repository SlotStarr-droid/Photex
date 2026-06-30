import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

interface AnalysisResult {
  description: string;
  objects: Array<{ name: string; confidence: number }>;
  scene: { type: string; confidence: number; description: string };
  text: Array<{ content: string; confidence: number }>;
  colors: Array<{ name: string; hex: string; percentage: number }>;
  faces: { count: number; confidence: number };
  inferences: Array<{
    attribute: string;
    value: string;
    confidence: number;
    reasoning: string;
  }>;
  tags: string[];
  safetyRating: string;
}

const DEFAULT_PROMPT = `Analyze this image thoroughly and return a JSON object with the following structure. Be precise and honest about confidence levels (0.0 to 1.0). Never claim certainty about inferred information.

Return ONLY valid JSON with this exact structure:
{
  "description": "detailed natural language description of the image",
  "objects": [{"name": "object name", "confidence": 0.95}],
  "scene": {"type": "indoor/outdoor/document/screenshot/etc", "confidence": 0.9, "description": "scene description"},
  "text": [{"content": "any text visible in the image", "confidence": 0.98}],
  "colors": [{"name": "color name", "hex": "#RRGGBB", "percentage": 35}],
  "faces": {"count": 0, "confidence": 0.99},
  "inferences": [
    {
      "attribute": "what is being inferred (e.g. 'Approximate time of day', 'Likely location type', 'Device used', 'Estimated year')",
      "value": "the inferred value",
      "confidence": 0.7,
      "reasoning": "brief explanation of why this inference was made"
    }
  ],
  "tags": ["tag1", "tag2"],
  "safetyRating": "safe/caution/unsafe"
}

For inferences, include estimates for: time of day, season/weather, location type, camera/device type, image purpose, and any other contextually interesting attributes. Always flag these as inferred, not verified. Use confidence scores honestly - if unsure, use lower scores (< 0.5).`;

const ALLOWED_MODELS = ["gpt-4o", "gpt-4o-mini"] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

function isAllowedModel(m: unknown): m is AllowedModel {
  return typeof m === "string" && (ALLOWED_MODELS as readonly string[]).includes(m);
}

router.post("/vision/analyze", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      model,
      systemPrompt,
    } = req.body as {
      imageBase64: string;
      mimeType?: string;
      model?: unknown;
      systemPrompt?: string;
    };

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const resolvedModel: AllowedModel = isAllowedModel(model) ? model : "gpt-4o";
    const resolvedPrompt = typeof systemPrompt === "string" && systemPrompt.trim().length > 0
      ? systemPrompt
      : DEFAULT_PROMPT;

    const response = await openai.chat.completions.create({
      model: resolvedModel,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
            {
              type: "text",
              text: resolvedPrompt,
            },
          ],
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";

    let analysis: AnalysisResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;
    } catch {
      res
        .status(500)
        .json({ error: "Failed to parse AI response", raw: content });
      return;
    }

    res.json({
      analysis,
      model: resolvedModel,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Vision analysis failed");
    res.status(500).json({ error: message });
  }
});

export default router;
