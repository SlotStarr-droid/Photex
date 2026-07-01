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
  logos: Array<{ name: string; confidence: number }>;
  landmarks: Array<{ name: string; confidence: number; location?: string }>;
  inferences: Array<{
    attribute: string;
    value: string;
    confidence: number;
    reasoning: string;
    evidence: string[];
  }>;
  tags: string[];
  safetyRating: string;
}

const ENHANCED_PROMPT = `You are Image Intelligence™, a privacy-first AI platform that analyzes images with explainable reasoning.

Analyze this image thoroughly and return a JSON object with the following structure. Be precise and honest about confidence levels (0.0 to 1.0). Never claim certainty about inferred information.

CRITICAL RULES:
1. Separate VERIFIED facts (from metadata) from INFERRED conclusions (from visual analysis)
2. For every inference, provide:
   - The inferred value
   - Confidence score (0.0-1.0)
   - Explicit reasoning explanation
   - Evidence items that support the inference
3. Always flag inferred information as such - never present it as verified fact
4. If unsure, use lower confidence scores (< 0.5)

Return ONLY valid JSON with this exact structure:
{
  "description": "detailed natural language description of the image content",
  "objects": [{"name": "object name", "confidence": 0.95}],
  "scene": {"type": "indoor/outdoor/document/screenshot/vehicle/landscape/portrait/etc", "confidence": 0.9, "description": "detailed scene description"},
  "text": [{"content": "any text visible in the image", "confidence": 0.98}],
  "colors": [{"name": "color name", "hex": "#RRGGBB", "percentage": 35}],
  "faces": {"count": 0, "confidence": 0.99},
  "logos": [{"name": "brand/logo name", "confidence": 0.85}],
  "landmarks": [{"name": "landmark name", "confidence": 0.8, "location": "city/region if identifiable"}],
  "inferences": [
    {
      "attribute": "what is being inferred (e.g. 'Approximate time of day', 'Likely location type', 'Device used', 'Estimated year', 'Weather conditions', 'Season', 'Event type')",
      "value": "the inferred value",
      "confidence": 0.7,
      "reasoning": "detailed explanation of why this inference was made",
      "evidence": ["evidence item 1", "evidence item 2", "evidence item 3"]
    }
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "safetyRating": "safe/caution/unsafe"
}

INFERENCE GUIDELINES:
- Time of day: Look for shadow angles, lighting quality, sky color. Low confidence if ambiguous.
- Season/Weather: Vegetation state, snow, rain, cloud cover, sun angle
- Location type: Urban/rural/beach/mountain/forest/desert based on visible features
- Device type: Camera model from EXIF (verified), or infer from image quality, aspect ratio, lens characteristics
- Image purpose: Personal photo, document scan, screenshot, artwork, professional photo, etc.
- Event context: Birthday, wedding, travel, work, casual, etc.
- Architecture/Building style: If visible, identify style period and region
- Vehicle identification: Make/model if visible
- Animal species: If present
- Estimated year: Based on clothing, vehicles, technology, image quality, color grading

For each inference, include 2-5 evidence items that support your conclusion.`;

const ALLOWED_MODELS = ["gpt-4o", "gpt-4o-mini"] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];

function isAllowedModel(m: unknown): m is AllowedModel {
  return typeof m === "string" && (ALLOWED_MODELS as readonly string[]).includes(m);
}

router.post("/vision/analyze-enhanced", async (req, res) => {
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
      : ENHANCED_PROMPT;

    const response = await openai.chat.completions.create({
      model: resolvedModel,
      max_tokens: 3000,
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
    req.log.error({ err }, "Enhanced vision analysis failed");
    res.status(500).json({ error: message });
  }
});

export default router;
