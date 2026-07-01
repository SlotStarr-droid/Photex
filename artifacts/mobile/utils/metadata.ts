/**
 * Enhanced metadata extraction with cryptographic hashing, IPTC/XMP parsing,
 * and source verification logic for Image Intelligence™.
 *
 * This module extracts verified metadata (EXIF, file attributes, hashes)
 * and generates inferred metadata (source determination, device category, etc.)
 * with confidence scores.
 */

import * as Crypto from "expo-crypto";

import type { ImageMetadata, ImageSource, SourceEvidence } from "@/types/image";

export interface FileInfo {
  uri: string;
  size?: number;
  mimeType?: string;
  fileName?: string;
  modificationTime?: number;
}

export interface HashResult {
  md5: string;
  sha1: string;
  sha256: string;
}

/**
 * Compute cryptographic hashes of file content.
 * Used for duplicate detection and forensic verification.
 */
export async function computeFileHashes(base64Data: string): Promise<HashResult> {
  // Note: expo-crypto provides basic hashing. For production, consider
  // using a native module or server-side hashing for large files.
  const md5 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.MD5,
    base64Data,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  const sha1 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    base64Data,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  const sha256 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    base64Data,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  return { md5, sha1, sha256 };
}

/**
 * Infer image source and confidence based on available metadata.
 *
 * Verified sources (high confidence):
 * - Camera: EXIF Make/Model present, GPS often available, timestamp precise
 * - Gallery: No EXIF or minimal EXIF
 * - Screenshot: Specific dimensions (e.g., 1080×1920), no GPS, no camera model
 *
 * Inferred sources (lower confidence):
 * - Download: File attributes suggest recent download, no EXIF
 * - Email/Messaging: Metadata suggests attachment origin
 * - Cloud: File path or metadata indicates cloud storage
 */
export function inferSourceEvidence(
  metadata: Partial<ImageMetadata>,
  fileName?: string,
  fileSize?: number,
): SourceEvidence {
  const evidence: SourceEvidence = {
    source: "unknown",
    determinedBy: "ai_inference",
    confidence: 0.3,
    reasoning: "No metadata available for source determination",
  };

  // Verified: Camera with EXIF
  if (metadata.deviceMake || metadata.deviceModel) {
    evidence.source = "camera";
    evidence.determinedBy = "verified_metadata";
    evidence.confidence = 0.95;
    evidence.reasoning =
      "Device make/model found in EXIF metadata indicates camera capture";
    return evidence;
  }

  // Verified: GPS coordinates indicate camera
  if (metadata.gpsLatitude !== undefined && metadata.gpsLongitude !== undefined) {
    evidence.source = "camera";
    evidence.determinedBy = "verified_metadata";
    evidence.confidence = 0.9;
    evidence.reasoning = "GPS coordinates in EXIF indicate camera capture with location";
    return evidence;
  }

  // Inferred: Screenshot detection by dimensions
  if (metadata.width && metadata.height) {
    const aspect = metadata.width / metadata.height;
    const commonScreenshots = [
      { w: 1080, h: 1920, name: "Android" }, // 9:16
      { w: 1125, h: 2436, name: "iPhone" }, // ~9:19.5
      { w: 1242, h: 2688, name: "iPhone Max" }, // ~9:19.5
      { w: 750, h: 1334, name: "iPhone SE" }, // 9:16
      { w: 1440, h: 2560, name: "Android" }, // 9:16
    ];

    const isCommonScreenshot = commonScreenshots.some(
      (s) =>
        (metadata.width === s.w && metadata.height === s.h) ||
        (Math.abs(aspect - s.w / s.h) < 0.01),
    );

    if (isCommonScreenshot && !metadata.deviceMake && !metadata.gpsLatitude) {
      evidence.source = "screenshot";
      evidence.determinedBy = "ai_inference";
      evidence.confidence = 0.75;
      evidence.reasoning = `Image dimensions (${metadata.width}×${metadata.height}) match common screenshot resolution`;
      return evidence;
    }
  }

  // Inferred: File name patterns
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    if (
      lowerName.includes("screenshot") ||
      lowerName.includes("screen shot") ||
      lowerName.startsWith("screenshot_")
    ) {
      evidence.source = "screenshot";
      evidence.determinedBy = "filesystem_evidence";
      evidence.confidence = 0.85;
      evidence.reasoning = "File name contains 'screenshot' pattern";
      return evidence;
    }

    if (
      lowerName.includes("download") ||
      lowerName.includes("downloaded")
    ) {
      evidence.source = "download";
      evidence.determinedBy = "filesystem_evidence";
      evidence.confidence = 0.7;
      evidence.reasoning = "File name suggests download origin";
      return evidence;
    }

    if (
      lowerName.includes("cloud") ||
      lowerName.includes("dropbox") ||
      lowerName.includes("gdrive") ||
      lowerName.includes("onedrive")
    ) {
      evidence.source = "cloud";
      evidence.determinedBy = "filesystem_evidence";
      evidence.confidence = 0.8;
      evidence.reasoning = "File name or path indicates cloud storage origin";
      return evidence;
    }
  }

  // Default: Gallery (most common for local imports)
  evidence.source = "gallery";
  evidence.determinedBy = "ai_inference";
  evidence.confidence = 0.5;
  evidence.reasoning = "No specific metadata found; defaulting to gallery import";
  return evidence;
}

/**
 * Parse IPTC metadata from raw EXIF data.
 * IPTC keywords, copyright, description, and other editorial metadata.
 */
export function parseIptcMetadata(exif: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!exif) return {};

  const iptc: Record<string, unknown> = {};

  // Common IPTC fields that may be in EXIF
  const iptcFields = [
    "Keywords",
    "Copyright",
    "Creator",
    "Description",
    "Title",
    "Caption",
    "Credit",
    "Source",
    "CopyrightNotice",
    "Instructions",
  ];

  for (const field of iptcFields) {
    if (exif[field] !== undefined) {
      iptc[field] = exif[field];
    }
  }

  return iptc;
}

/**
 * Parse XMP metadata from raw EXIF data.
 * XMP is used for creative/technical metadata like color space, profiles, etc.
 */
export function parseXmpMetadata(exif: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!exif) return {};

  const xmp: Record<string, unknown> = {};

  // Common XMP fields
  const xmpFields = [
    "ColorSpace",
    "WhiteBalance",
    "LensModel",
    "LensMake",
    "SerialNumber",
    "InternalSerialNumber",
    "UniqueCameraModel",
    "Software",
    "ProcessingSoftware",
    "RenditionClass",
  ];

  for (const field of xmpFields) {
    if (exif[field] !== undefined) {
      xmp[field] = exif[field];
    }
  }

  return xmp;
}

/**
 * Build comprehensive metadata object with verified/inferred distinction.
 * This replaces the simple buildMetadata function and includes hashes,
 * source verification, and richer metadata extraction.
 */
export async function buildEnhancedMetadata(
  asset: {
    width?: number;
    height?: number;
    mimeType?: string;
    fileName?: string;
    exif?: Record<string, unknown>;
    base64?: string;
  },
  parsedExif: {
    gps?: { latitude: number; longitude: number; altitude?: number };
    deviceMake?: string;
    deviceModel?: string;
    capturedAt?: string;
    isoSpeed?: number;
    focalLength?: number;
    aperture?: number;
    exposureTime?: string;
    orientation?: number;
  },
): Promise<ImageMetadata> {
  const metadata: ImageMetadata = {
    width: asset.width,
    height: asset.height,
    mimeType: asset.mimeType ?? "image/jpeg",
    fileName: asset.fileName,
    creationTime: parsedExif.capturedAt ?? new Date().toISOString(),
    modificationTime: new Date().toISOString(),
    gpsLatitude: parsedExif.gps?.latitude,
    gpsLongitude: parsedExif.gps?.longitude,
    deviceMake: parsedExif.deviceMake,
    deviceModel: parsedExif.deviceModel,
    exif: asset.exif,
  };

  // Add IPTC and XMP metadata
  if (asset.exif) {
    const iptc = parseIptcMetadata(asset.exif);
    const xmp = parseXmpMetadata(asset.exif);
    if (Object.keys(iptc).length > 0) {
      metadata.exif = { ...metadata.exif, ...iptc };
    }
    if (Object.keys(xmp).length > 0) {
      metadata.exif = { ...metadata.exif, ...xmp };
    }
  }

  // Compute cryptographic hashes if base64 is available
  if (asset.base64) {
    try {
      const hashes = await computeFileHashes(asset.base64);
      metadata.exif = {
        ...metadata.exif,
        md5Hash: hashes.md5,
        sha1Hash: hashes.sha1,
        sha256Hash: hashes.sha256,
      };
    } catch (err) {
      console.warn("Failed to compute file hashes:", err);
    }
  }

  return metadata;
}

/**
 * Infer device category from EXIF data.
 * Used for contextual inferences about capture conditions.
 */
export function inferDeviceCategory(
  deviceMake?: string,
  deviceModel?: string,
): string {
  if (!deviceMake && !deviceModel) return "unknown";

  const make = (deviceMake ?? "").toLowerCase();
  const model = (deviceModel ?? "").toLowerCase();

  if (make.includes("apple") || model.includes("iphone") || model.includes("ipad")) {
    return "iOS Device";
  }
  if (make.includes("samsung") || make.includes("google")) {
    return "Android Device";
  }
  if (make.includes("canon") || make.includes("nikon") || make.includes("sony")) {
    return "DSLR Camera";
  }
  if (model.includes("drone") || model.includes("mavic") || model.includes("phantom")) {
    return "Drone";
  }

  return "Mobile Device";
}
