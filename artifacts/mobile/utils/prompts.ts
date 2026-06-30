import type { PromptTemplate } from "@/types/image";

const BASE_JSON_SHAPE = `Return ONLY valid JSON with this exact structure:
{
  "description": "detailed natural language description",
  "objects": [{"name": "object name", "confidence": 0.95}],
  "scene": {"type": "indoor/outdoor/document/screenshot/etc", "confidence": 0.9, "description": "scene description"},
  "text": [{"content": "any text visible", "confidence": 0.98}],
  "colors": [{"name": "color name", "hex": "#RRGGBB", "percentage": 35}],
  "faces": {"count": 0, "confidence": 0.99},
  "inferences": [
    {
      "attribute": "what is being inferred",
      "value": "the inferred value",
      "confidence": 0.7,
      "reasoning": "brief explanation"
    }
  ],
  "tags": ["tag1", "tag2"],
  "safetyRating": "safe/caution/unsafe"
}

Use confidence scores honestly — if unsure, use lower scores (< 0.5). Never claim certainty about inferred information.`;

export const BUILT_IN_TEMPLATES: PromptTemplate[] = [
  {
    id: "general",
    name: "General",
    description: "Balanced analysis of all image attributes",
    icon: "eye",
    focusAreas: ["objects", "scene", "colors", "text", "inferences"],
    builtIn: true,
    systemPrompt: `Analyze this image thoroughly and return a JSON object. Be precise and honest about confidence levels (0.0 to 1.0). For inferences, include estimates for: time of day, season/weather, location type, camera/device type, image purpose, and any other contextually interesting attributes. Always flag these as inferred, not verified.

${BASE_JSON_SHAPE}`,
  },
  {
    id: "forensic",
    name: "Forensic",
    description: "Digital authenticity, manipulation clues, metadata inconsistencies",
    icon: "search",
    focusAreas: ["manipulation", "shadows", "lighting", "compression", "artifacts"],
    builtIn: true,
    systemPrompt: `Perform a forensic-level digital image analysis. Focus on:
- Visual inconsistencies (lighting direction mismatches, shadow anomalies, edge artifacts)
- Signs of digital manipulation or compositing (cloning, splicing, AI generation tells)
- Compression artifacts and their patterns (JPEG block boundaries, noise inconsistencies)
- Metadata vs visual content consistency (claimed device vs optical signature)
- Reflection and perspective inconsistencies
- Color grading anomalies that suggest heavy post-processing

In the "inferences" array, lead with authenticity-related findings. Use low confidence scores when manipulation is uncertain. Do not accuse — describe observations only.

${BASE_JSON_SHAPE}`,
  },
  {
    id: "scene",
    name: "Scene",
    description: "Environment, weather, geography, and temporal context",
    icon: "map",
    focusAreas: ["weather", "time", "season", "geography", "lighting", "environment"],
    builtIn: true,
    systemPrompt: `Analyze the scene, environment, and contextual setting of this image. Focus on:
- Time of day (sun angle, shadows, artificial light color temperature)
- Season and weather conditions (vegetation state, precipitation, cloud patterns, temperature cues)
- Geographic region cues (architecture style, vegetation type, road markings, signage language)
- Indoor vs outdoor, urban vs rural, public vs private
- Event context (is this a particular type of gathering, occasion, or activity setting?)
- Environmental conditions (air quality, fog, humidity visible in distance)

Prioritize environmental inferences with detailed reasoning. Note which cues are verified (e.g. visible clock) vs inferred (e.g. sun angle).

${BASE_JSON_SHAPE}`,
  },
  {
    id: "text",
    name: "Text & Docs",
    description: "All readable text, numbers, plates, logos, and documents",
    icon: "file-text",
    focusAreas: ["ocr", "logos", "plates", "documents", "labels", "signage"],
    builtIn: true,
    systemPrompt: `Extract and analyze all text and textual content in this image. Focus on:
- All readable text (OCR), including partial or obscured text — note confidence per fragment
- License plates, ID numbers, serial numbers, barcodes (describe without reproducing sensitive personal data)
- Brand logos and trademarks (identify brand, not just shape)
- Document type if visible (form, receipt, sign, label, newspaper, book)
- Language(s) detected and any translation notes
- Handwritten vs printed text distinction
- Numerical data (dates, prices, measurements, coordinates)

In the "text" array, include every distinct readable string. Use low confidence when text is partially visible. In "inferences", note what the text content implies about context.

${BASE_JSON_SHAPE}`,
  },
  {
    id: "geolocation",
    name: "Geolocation",
    description: "Location-identifying visual features and geographic cues",
    icon: "map-pin",
    focusAreas: ["landmarks", "architecture", "signage", "vegetation", "infrastructure"],
    builtIn: true,
    systemPrompt: `Analyze this image for geographic and location-identifying information. Focus on:
- Recognizable landmarks, monuments, or distinctive structures
- Architecture style and construction materials that indicate region or era
- Street signage, road markings, and traffic infrastructure patterns by country
- Vegetation and landscape that indicates climate zone and region
- Language on signs, packaging, or visible text that suggests locale
- Vehicle types, license plate formats (region only, not full plates)
- Cultural or commercial indicators (store names, flag patterns, currency)
- Sky conditions and sun position relative to estimated time

Rate each location inference with confidence and explain the visual evidence. Never fabricate specific addresses. Use broad region estimates (city, country, region) unless strong evidence supports more specificity.

${BASE_JSON_SHAPE}`,
  },
  {
    id: "people",
    name: "People",
    description: "People, activities, expressions, and social context",
    icon: "users",
    focusAreas: ["people", "activity", "expressions", "clothing", "interaction"],
    builtIn: true,
    systemPrompt: `Analyze people and human activity in this image. Focus on:
- Number of people visible (fully or partially)
- Activities and interactions occurring
- Apparent emotional tone (group mood, body language) — not individual mental states
- Clothing styles and what they suggest about context (formal, casual, occupational, cultural)
- Age groups present (child, adult, elderly) — general ranges only, not specific ages
- Accessibility or mobility indicators
- Social context (family, professional, social gathering, crowd, solitary)

Important: Do NOT infer race, ethnicity, gender identity, or political affiliation. Do NOT identify specific individuals. Focus on observable behaviors and social context. Use conservative confidence scores for all person-related inferences.

${BASE_JSON_SHAPE}`,
  },
];

export function getTemplateById(id: string): PromptTemplate {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id) ?? BUILT_IN_TEMPLATES[0]!;
}
