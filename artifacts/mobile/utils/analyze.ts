import * as FileSystem from "expo-file-system";

import type { AIAnalysis } from "@/types/image";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

export interface AnalyzeOptions {
  model?: string;
  systemPrompt?: string;
  templateId?: string;
}

export async function analyzeImage(
  uri: string,
  mimeType = "image/jpeg",
  options?: AnalyzeOptions,
): Promise<AIAnalysis> {
  let base64: string;

  try {
    const result = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    base64 = result;
  } catch {
    throw new Error("Failed to read image file");
  }

  const response = await fetch(`${BASE_URL}/api/vision/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
      model: options?.model,
      systemPrompt: options?.systemPrompt,
    }),
  });

  if (!response.ok) {
    const err = (await response
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(err.error ?? `HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    analysis: AIAnalysis;
    model: string;
    analyzedAt: string;
  };
  return {
    ...data.analysis,
    model: data.model,
    analyzedAt: data.analyzedAt,
    templateId: options?.templateId,
  };
}

export function confidenceColor(confidence: number): string {
  if (confidence >= 0.75) return "#10B981";
  if (confidence >= 0.5) return "#F59E0B";
  return "#EF4444";
}

export function confidenceLabel(confidence: number): string {
  if (confidence >= 0.85) return "High";
  if (confidence >= 0.65) return "Medium";
  if (confidence >= 0.4) return "Low";
  return "Very Low";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}
