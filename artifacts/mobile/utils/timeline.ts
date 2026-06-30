import type { StoredImage } from "@/types/image";

export interface TimelineEvent {
  imageId: string;
  timestamp: string;
  timestampVerified: boolean;
  confidence: number;
  dateLabel: string;
  timeLabel: string;
}

export interface TimelineDay {
  dateKey: string;
  dateLabel: string;
  events: TimelineEvent[];
}

function getImageTimestamp(image: StoredImage): {
  timestamp: string;
  verified: boolean;
  confidence: number;
} {
  // Priority 1: verified EXIF timestamp
  const exifTs =
    image.metadata.creationTime ??
    (image.metadata.exif?.["DateTimeOriginal"] as string | undefined) ??
    (image.metadata.exif?.["DateTime"] as string | undefined);

  if (exifTs) {
    const d = new Date(exifTs);
    if (!isNaN(d.getTime())) {
      return { timestamp: d.toISOString(), verified: true, confidence: 0.99 };
    }
  }

  // Priority 2: AI estimated timestamp inference
  if (image.analysis) {
    const tsInf = image.analysis.inferences.find(
      (inf) =>
        inf.attribute.toLowerCase().includes("time") ||
        inf.attribute.toLowerCase().includes("date") ||
        inf.attribute.toLowerCase().includes("year")
    );
    if (tsInf) {
      return {
        timestamp: image.addedAt,
        verified: false,
        confidence: tsInf.confidence * 0.6,
      };
    }

    // Priority 3: AI estimated timestamp from analysis
    if (image.analysis.estimatedTimestamp) {
      const d = new Date(image.analysis.estimatedTimestamp);
      if (!isNaN(d.getTime())) {
        return { timestamp: d.toISOString(), verified: false, confidence: 0.5 };
      }
    }
  }

  // Priority 4: file addedAt (device import time, not image creation)
  return { timestamp: image.addedAt, verified: false, confidence: 0.2 };
}

export function buildTimeline(images: StoredImage[]): TimelineDay[] {
  const events: TimelineEvent[] = images.map((img) => {
    const { timestamp, verified, confidence } = getImageTimestamp(img);
    const d = new Date(timestamp);
    return {
      imageId: img.id,
      timestamp,
      timestampVerified: verified,
      confidence,
      dateLabel: d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      timeLabel: verified
        ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        : "Time unknown",
    };
  });

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const dayMap = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const d = new Date(ev.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(ev);
  }

  return [...dayMap.entries()].map(([key, evs]) => ({
    dateKey: key,
    dateLabel: evs[0].dateLabel,
    events: evs,
  }));
}

export function getSourceLabel(
  source: StoredImage["source"],
  determinedBy?: string
): string {
  const sourceMap: Record<string, string> = {
    camera: "Camera",
    gallery: "Photo Library",
    screenshot: "Screenshot",
    download: "Download",
    messaging: "Messaging App",
    email: "Email Attachment",
    cloud: "Cloud Storage",
    unknown: "Unknown Source",
  };
  const label = sourceMap[source] ?? "Unknown";
  if (!determinedBy) return label;
  const method =
    determinedBy === "verified_metadata"
      ? "VERIFIED"
      : determinedBy === "filesystem_evidence"
      ? "FILE EVIDENCE"
      : "AI INFERRED";
  return `${label} · ${method}`;
}
