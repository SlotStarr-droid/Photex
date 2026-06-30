import type {
  EdgeEvidenceType,
  EdgeRelationType,
  GraphEdge,
  GraphNode,
  StoredImage,
} from "@/types/image";

function makeId() {
  return Math.random().toString(36).substring(2, 10);
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function gpsDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sameDay(a: string, b: string): boolean {
  try {
    const da = new Date(a).toDateString();
    const db = new Date(b).toDateString();
    return da === db && da !== "Invalid Date";
  } catch {
    return false;
  }
}

export function extractEdges(images: StoredImage[]): GraphEdge[] {
  const analyzed = images.filter((i) => i.status === "complete" && i.analysis);
  const edges: GraphEdge[] = [];

  for (let i = 0; i < analyzed.length; i++) {
    for (let j = i + 1; j < analyzed.length; j++) {
      const a = analyzed[i];
      const b = analyzed[j];
      const aa = a.analysis!;
      const ab = b.analysis!;

      const newEdge = (
        relationType: EdgeRelationType,
        evidenceType: EdgeEvidenceType,
        confidence: number,
        label: string,
        evidenceItems: string[],
        reasoning: string
      ): GraphEdge => ({
        id: makeId(),
        sourceId: a.id,
        targetId: b.id,
        relationType,
        evidenceType,
        confidence,
        label,
        evidence: evidenceItems.map((item) => ({
          item,
          verified: evidenceType === "verified",
        })),
        reasoning,
      });

      // --- VERIFIED EDGES ---

      // Same GPS coordinates (within 100m)
      const aLat = a.metadata.gpsLatitude ?? (aa.inferences.find(inf => inf.attribute.toLowerCase().includes("gps"))?.value ? undefined : undefined);
      const bLat = b.metadata.gpsLatitude;
      if (
        a.metadata.gpsLatitude != null &&
        a.metadata.gpsLongitude != null &&
        b.metadata.gpsLatitude != null &&
        b.metadata.gpsLongitude != null
      ) {
        const dist = gpsDistance(
          a.metadata.gpsLatitude,
          a.metadata.gpsLongitude,
          b.metadata.gpsLatitude,
          b.metadata.gpsLongitude
        );
        if (dist < 100) {
          edges.push(
            newEdge(
              "gps_proximity",
              "verified",
              0.98,
              "Same location (GPS)",
              [`GPS distance: ${Math.round(dist)}m`],
              "Both images share GPS coordinates within 100 metres — verified from EXIF metadata."
            )
          );
        }
      }

      // Same device (EXIF make + model)
      const aDevice = a.metadata.deviceMake && a.metadata.deviceModel
        ? `${a.metadata.deviceMake} ${a.metadata.deviceModel}`
        : aa.deviceMake && aa.deviceModel
        ? `${aa.deviceMake} ${aa.deviceModel}`
        : null;
      const bDevice = b.metadata.deviceMake && b.metadata.deviceModel
        ? `${b.metadata.deviceMake} ${b.metadata.deviceModel}`
        : ab.deviceMake && ab.deviceModel
        ? `${ab.deviceMake} ${ab.deviceModel}`
        : null;
      if (aDevice && bDevice && aDevice.toLowerCase() === bDevice.toLowerCase()) {
        edges.push(
          newEdge(
            "same_device",
            "verified",
            0.97,
            "Same device",
            [`Device: ${aDevice}`],
            `Both images were captured by the same device (${aDevice}) as recorded in EXIF metadata.`
          )
        );
      }

      // Same EXIF timestamp day
      const aTs = a.metadata.creationTime ?? a.metadata.exif?.["DateTime"] as string;
      const bTs = b.metadata.creationTime ?? b.metadata.exif?.["DateTime"] as string;
      if (aTs && bTs && sameDay(aTs, bTs)) {
        edges.push(
          newEdge(
            "same_date",
            "verified",
            0.95,
            "Same day (verified)",
            [`Date: ${new Date(aTs).toLocaleDateString()}`],
            "Both images share the same date as recorded in their EXIF timestamp metadata."
          )
        );
      }

      // --- INFERRED EDGES ---

      // Shared objects (Jaccard ≥ 0.3)
      const aObjs = aa.objects.filter((o) => o.confidence >= 0.6).map((o) => o.name);
      const bObjs = ab.objects.filter((o) => o.confidence >= 0.6).map((o) => o.name);
      const objJaccard = jaccard(aObjs, bObjs);
      if (objJaccard >= 0.3 && aObjs.length > 0) {
        const shared = aObjs.filter((o) =>
          bObjs.map((x) => x.toLowerCase()).includes(o.toLowerCase())
        );
        edges.push(
          newEdge(
            "shared_object",
            "inferred",
            Math.min(0.9, 0.5 + objJaccard * 0.7),
            "Shared objects",
            shared.slice(0, 5).map((o) => `Object detected: ${o}`),
            `Both images contain similar detected objects (${shared.slice(0, 3).join(", ")}), suggesting they may depict the same scene, event, or environment.`
          )
        );
      }

      // Shared tags (Jaccard ≥ 0.35)
      const tagJaccard = jaccard(aa.tags, ab.tags);
      if (tagJaccard >= 0.35 && aa.tags.length > 0) {
        const shared = aa.tags.filter((t) =>
          ab.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase())
        );
        edges.push(
          newEdge(
            "shared_tag",
            "inferred",
            Math.min(0.85, 0.45 + tagJaccard * 0.6),
            "Similar content",
            shared.slice(0, 5).map((t) => `Tag: ${t}`),
            `Both images share similar AI-assigned content tags (${shared.slice(0, 3).join(", ")}), indicating related subject matter.`
          )
        );
      }

      // Same scene type
      if (
        aa.scene.type.toLowerCase() === ab.scene.type.toLowerCase() &&
        aa.scene.type !== "unknown"
      ) {
        const conf = Math.min(aa.scene.confidence, ab.scene.confidence);
        if (conf >= 0.65) {
          edges.push(
            newEdge(
              "shared_scene",
              "inferred",
              conf * 0.85,
              `Same scene type: ${aa.scene.type}`,
              [
                `Scene type: ${aa.scene.type}`,
                `Image A confidence: ${Math.round(aa.scene.confidence * 100)}%`,
                `Image B confidence: ${Math.round(ab.scene.confidence * 100)}%`,
              ],
              `Both images were classified as the same scene type (${aa.scene.type}). This is an AI inference — images could be from different instances of this scene type.`
            )
          );
        }
      }

      // Faces in both
      if (aa.faces.count > 0 && ab.faces.count > 0) {
        const conf = Math.min(aa.faces.confidence, ab.faces.confidence) * 0.7;
        edges.push(
          newEdge(
            "shared_faces",
            "inferred",
            conf,
            `People present`,
            [
              `Image A: ${aa.faces.count} face(s) detected`,
              `Image B: ${ab.faces.count} face(s) detected`,
            ],
            "Both images contain faces, suggesting they may include the same people. Without on-device face clustering, this is a weak inference only."
          )
        );
      }

      // Shared OCR text
      const aText = aa.text.map((t) => t.content.toLowerCase());
      const bText = ab.text.map((t) => t.content.toLowerCase());
      if (aText.length > 0 && bText.length > 0) {
        const sharedWords = new Set<string>();
        for (const ta of aText) {
          for (const tb of bText) {
            if (ta.length > 4 && tb.includes(ta)) sharedWords.add(ta);
            else if (tb.length > 4 && ta.includes(tb)) sharedWords.add(tb);
          }
        }
        if (sharedWords.size >= 2) {
          edges.push(
            newEdge(
              "shared_text",
              "inferred",
              0.75,
              "Shared OCR text",
              [...sharedWords].slice(0, 4).map((w) => `Text: "${w}"`),
              `Both images contain similar recognized text content, suggesting they may be from the same document, sign, or conversation.`
            )
          );
        }
      }

      // Same inferred location type
      const aLocInf = aa.inferences.find(
        (inf) =>
          inf.attribute.toLowerCase().includes("location") ||
          inf.attribute.toLowerCase().includes("place")
      );
      const bLocInf = ab.inferences.find(
        (inf) =>
          inf.attribute.toLowerCase().includes("location") ||
          inf.attribute.toLowerCase().includes("place")
      );
      if (
        aLocInf &&
        bLocInf &&
        aLocInf.value.toLowerCase() === bLocInf.value.toLowerCase()
      ) {
        const conf = Math.min(aLocInf.confidence, bLocInf.confidence) * 0.8;
        if (conf >= 0.35) {
          edges.push(
            newEdge(
              "same_location_inferred",
              "inferred",
              conf,
              `Similar location: ${aLocInf.value}`,
              [
                `Image A inference: ${aLocInf.value} (${Math.round(aLocInf.confidence * 100)}%)`,
                `Image B inference: ${bLocInf.value} (${Math.round(bLocInf.confidence * 100)}%)`,
                `Reasoning: ${aLocInf.reasoning}`,
              ],
              `Both images were independently inferred to show the same type of location (${aLocInf.value}). This is an AI estimate and should not be taken as confirmed.`
            )
          );
        }
      }

      // Same inferred season/weather
      const aSeasonInf = aa.inferences.find(
        (inf) =>
          inf.attribute.toLowerCase().includes("season") ||
          inf.attribute.toLowerCase().includes("weather")
      );
      const bSeasonInf = ab.inferences.find(
        (inf) =>
          inf.attribute.toLowerCase().includes("season") ||
          inf.attribute.toLowerCase().includes("weather")
      );
      if (
        aSeasonInf &&
        bSeasonInf &&
        aSeasonInf.value.toLowerCase() === bSeasonInf.value.toLowerCase()
      ) {
        const conf = Math.min(aSeasonInf.confidence, bSeasonInf.confidence) * 0.65;
        if (conf >= 0.3) {
          edges.push(
            newEdge(
              "similar_weather",
              "inferred",
              conf,
              `Similar weather/season`,
              [
                `Image A: ${aSeasonInf.value}`,
                `Image B: ${bSeasonInf.value}`,
              ],
              `Both images appear to show similar weather or season conditions based on AI analysis of lighting, foliage, and environmental cues.`
            )
          );
        }
      }

      // Dominant color overlap
      const aColors = aa.colors.slice(0, 3).map((c) => c.name.toLowerCase());
      const bColors = ab.colors.slice(0, 3).map((c) => c.name.toLowerCase());
      const colorOverlap = jaccard(aColors, bColors);
      if (colorOverlap >= 0.5 && aColors.length >= 2) {
        const shared = aColors.filter((c) => bColors.includes(c));
        if (shared.length >= 2) {
          edges.push(
            newEdge(
              "similar_colors",
              "inferred",
              colorOverlap * 0.55,
              "Similar color palette",
              shared.map((c) => `Color: ${c}`),
              `Both images share a similar dominant color palette, which may indicate the same environment, lighting condition, or visual style.`
            )
          );
        }
      }
    }
  }

  // Deduplicate: keep only the strongest edge between each pair
  const pairMap = new Map<string, GraphEdge>();
  for (const edge of edges) {
    const key = [edge.sourceId, edge.targetId].sort().join("|");
    const existing = pairMap.get(key);
    if (!existing || edge.confidence > existing.confidence) {
      pairMap.set(key, edge);
    }
  }

  return [...pairMap.values()];
}

// ---- Force-directed layout ----

const REPULSION = 8000;
const SPRING_NATURAL = 220;
const SPRING_STRENGTH = 0.04;
const CENTER_GRAVITY = 0.008;
const DAMPING = 0.82;

export function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 120
): GraphNode[] {
  if (nodes.length === 0) return nodes;

  const ns = nodes.map((n) => ({ ...n }));
  const nodeMap = new Map(ns.map((n) => [n.imageId, n]));

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const a = ns[i], b = ns[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx -= fx; a.vy -= fy;
        b.vx += fx; b.vy += fy;
      }
    }

    // Spring forces for edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.sourceId);
      const b = nodeMap.get(edge.targetId);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const displacement = dist - SPRING_NATURAL;
      const force = displacement * SPRING_STRENGTH * edge.confidence;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // Center gravity
    const cx = width / 2, cy = height / 2;
    for (const n of ns) {
      n.vx += (cx - n.x) * CENTER_GRAVITY;
      n.vy += (cy - n.y) * CENTER_GRAVITY;
    }

    // Integrate + damp + clamp
    const margin = 60;
    for (const n of ns) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x = Math.max(margin, Math.min(width - margin, n.x + n.vx));
      n.y = Math.max(margin, Math.min(height - margin, n.y + n.vy));
    }
  }

  return ns;
}

export function buildInitialNodes(
  images: StoredImage[],
  width: number,
  height: number
): GraphNode[] {
  return images
    .filter((i) => i.status === "complete" && i.analysis)
    .map((img, idx) => {
      const angle = (idx / images.length) * Math.PI * 2;
      const r = Math.min(width, height) * 0.3;
      return {
        id: img.id,
        imageId: img.id,
        x: width / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: height / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
      };
    });
}

export const EDGE_COLORS: Record<string, string> = {
  verified: "#10B981",
  inferred: "#F59E0B",
};

export const RELATION_LABELS: Record<string, string> = {
  shared_object: "Shared Objects",
  shared_scene: "Same Scene",
  shared_tag: "Similar Content",
  same_device: "Same Device",
  same_date: "Same Date",
  gps_proximity: "GPS Proximity",
  shared_text: "Shared Text",
  same_source: "Same Source",
  shared_faces: "People Present",
  similar_colors: "Color Palette",
  same_event_inferred: "Same Event",
  same_location_inferred: "Similar Location",
  same_vehicle_inferred: "Same Vehicle",
  similar_weather: "Weather/Season",
  similar_architecture: "Architecture",
  duplicate: "Duplicate",
  near_duplicate: "Near Duplicate",
};
