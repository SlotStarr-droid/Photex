export interface ImageMetadata {
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
  creationTime?: string;
  modificationTime?: string;
  exif?: Record<string, unknown>;
}

export interface DetectedObject {
  name: string;
  confidence: number;
}

export interface SceneInfo {
  type: string;
  confidence: number;
  description: string;
}

export interface DetectedText {
  content: string;
  confidence: number;
}

export interface ColorInfo {
  name: string;
  hex: string;
  percentage: number;
}

export interface FaceInfo {
  count: number;
  confidence: number;
}

export interface Inference {
  attribute: string;
  value: string;
  confidence: number;
  reasoning: string;
}

export interface AIAnalysis {
  description: string;
  objects: DetectedObject[];
  scene: SceneInfo;
  text: DetectedText[];
  colors: ColorInfo[];
  faces: FaceInfo;
  inferences: Inference[];
  tags: string[];
  safetyRating: string;
  model?: string;
  analyzedAt?: string;
}

export type AnalysisStatus = "pending" | "analyzing" | "complete" | "error";

export interface StoredImage {
  id: string;
  uri: string;
  base64?: string;
  metadata: ImageMetadata;
  analysis?: AIAnalysis;
  status: AnalysisStatus;
  error?: string;
  addedAt: string;
  source: "camera" | "gallery";
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  imageId?: string;
  details: string;
}
