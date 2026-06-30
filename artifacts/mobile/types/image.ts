export interface ImageMetadata {
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  fileName?: string;
  creationTime?: string;
  modificationTime?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  deviceMake?: string;
  deviceModel?: string;
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
  deviceMake?: string;
  deviceModel?: string;
  estimatedTimestamp?: string;
  estimatedLocation?: string;
}

export type AnalysisStatus = "pending" | "analyzing" | "complete" | "error";

export type ImageSource =
  | "camera"
  | "gallery"
  | "screenshot"
  | "download"
  | "messaging"
  | "email"
  | "cloud"
  | "unknown";

export interface SourceEvidence {
  source: ImageSource;
  determinedBy: "verified_metadata" | "filesystem_evidence" | "ai_inference";
  confidence: number;
  reasoning: string;
}

export interface StoredImage {
  id: string;
  uri: string;
  base64?: string;
  metadata: ImageMetadata;
  analysis?: AIAnalysis;
  status: AnalysisStatus;
  error?: string;
  addedAt: string;
  source: ImageSource;
  sourceEvidence?: SourceEvidence;
  userLabels?: string[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  imageId?: string;
  details: string;
}

export type EdgeEvidenceType = "verified" | "inferred";

export type EdgeRelationType =
  | "shared_object"
  | "shared_scene"
  | "shared_tag"
  | "same_device"
  | "same_date"
  | "gps_proximity"
  | "shared_text"
  | "same_source"
  | "shared_faces"
  | "similar_colors"
  | "same_event_inferred"
  | "same_location_inferred"
  | "same_vehicle_inferred"
  | "similar_weather"
  | "similar_architecture"
  | "duplicate"
  | "near_duplicate";

export interface EdgeEvidence {
  item: string;
  verified: boolean;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: EdgeRelationType;
  evidenceType: EdgeEvidenceType;
  confidence: number;
  label: string;
  evidence: EdgeEvidence[];
  reasoning: string;
}

export interface GraphNode {
  id: string;
  imageId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface UserCorrection {
  id: string;
  imageId: string;
  attribute: string;
  originalValue: string;
  correctedValue: string;
  timestamp: string;
  appliedToFuture: boolean;
}

export interface DuplicateCluster {
  id: string;
  type: "exact" | "near_duplicate" | "edited" | "burst" | "similar_content";
  imageIds: string[];
  confidence: number;
  reasoning: string;
}

export interface Investigation {
  id: string;
  title: string;
  description: string;
  imageIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}
