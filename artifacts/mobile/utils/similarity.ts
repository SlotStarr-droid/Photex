import type { DuplicateCluster, StoredImage } from "@/types/image";

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function makeId() {
  return "dup_" + Math.random().toString(36).substring(2, 10);
}

export interface SimilarityScore {
  imageIdA: string;
  imageIdB: string;
  score: number;
  reasons: string[];
}

export function computeSimilarity(
  a: StoredImage,
  b: StoredImage
): SimilarityScore {
  const aa = a.analysis;
  const ab = b.analysis;
  const reasons: string[] = [];
  let score = 0;

  if (!aa || !ab) return { imageIdA: a.id, imageIdB: b.id, score: 0, reasons };

  // Tag similarity (weight: 0.3)
  const tagSim = jaccard(aa.tags, ab.tags);
  if (tagSim > 0.3) {
    score += tagSim * 0.3;
    reasons.push(`${Math.round(tagSim * 100)}% tag overlap`);
  }

  // Object similarity (weight: 0.35)
  const aObjs = aa.objects.map((o) => o.name);
  const bObjs = ab.objects.map((o) => o.name);
  const objSim = jaccard(aObjs, bObjs);
  if (objSim > 0.3) {
    score += objSim * 0.35;
    reasons.push(`${Math.round(objSim * 100)}% object overlap`);
  }

  // Scene type match (weight: 0.2)
  if (
    aa.scene.type.toLowerCase() === ab.scene.type.toLowerCase() &&
    aa.scene.type !== "unknown"
  ) {
    score += 0.2;
    reasons.push(`Same scene: ${aa.scene.type}`);
  }

  // File size similarity (weight: 0.1) — exact duplicates
  if (a.metadata.fileSize && b.metadata.fileSize) {
    const ratio =
      Math.min(a.metadata.fileSize, b.metadata.fileSize) /
      Math.max(a.metadata.fileSize, b.metadata.fileSize);
    if (ratio > 0.95) {
      score += 0.1;
      reasons.push("Near-identical file size");
    }
  }

  // Dimensions match (weight: 0.05)
  if (
    a.metadata.width &&
    b.metadata.width &&
    a.metadata.width === b.metadata.width &&
    a.metadata.height === b.metadata.height
  ) {
    score += 0.05;
    reasons.push(`Same dimensions: ${a.metadata.width}×${a.metadata.height}`);
  }

  // OCR text similarity (weight: 0.1)
  if (aa.text.length > 0 && ab.text.length > 0) {
    const aText = aa.text.map((t) => t.content.toLowerCase());
    const bText = ab.text.map((t) => t.content.toLowerCase());
    const textSim = jaccard(aText, bText);
    if (textSim > 0.5) {
      score += textSim * 0.1;
      reasons.push(`${Math.round(textSim * 100)}% text similarity`);
    }
  }

  return { imageIdA: a.id, imageIdB: b.id, score: Math.min(1, score), reasons };
}

export type ClusterType = DuplicateCluster["type"];

function classifyCluster(maxScore: number, reasons: string[]): ClusterType {
  const hasFileSizeMatch = reasons.some((r) => r.includes("file size"));
  const hasDimensionMatch = reasons.some((r) => r.includes("dimensions"));
  if (maxScore >= 0.9 && hasFileSizeMatch && hasDimensionMatch) return "exact";
  if (maxScore >= 0.75) return "near_duplicate";
  if (maxScore >= 0.55) return "edited";
  if (reasons.some((r) => r.includes("text"))) return "similar_content";
  return "similar_content";
}

export function findDuplicateClusters(
  images: StoredImage[],
  threshold = 0.5
): DuplicateCluster[] {
  const analyzed = images.filter((i) => i.status === "complete" && i.analysis);
  if (analyzed.length < 2) return [];

  // Build similarity graph
  const scores: SimilarityScore[] = [];
  for (let i = 0; i < analyzed.length; i++) {
    for (let j = i + 1; j < analyzed.length; j++) {
      const s = computeSimilarity(analyzed[i], analyzed[j]);
      if (s.score >= threshold) scores.push(s);
    }
  }

  // Union-Find clustering
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!));
    return parent.get(x)!;
  };
  const union = (x: string, y: string) => {
    parent.set(find(x), find(y));
  };

  for (const img of analyzed) parent.set(img.id, img.id);
  for (const s of scores) union(s.imageIdA, s.imageIdB);

  // Group by cluster root
  const clusterMap = new Map<string, string[]>();
  for (const img of analyzed) {
    const root = find(img.id);
    if (!clusterMap.has(root)) clusterMap.set(root, []);
    clusterMap.get(root)!.push(img.id);
  }

  // Build DuplicateCluster objects for groups of ≥2
  const clusters: DuplicateCluster[] = [];
  for (const [, members] of clusterMap) {
    if (members.length < 2) continue;

    // Get max score and reasons for this cluster
    const clusterScores = scores.filter(
      (s) =>
        members.includes(s.imageIdA) && members.includes(s.imageIdB)
    );
    const maxScore = clusterScores.reduce((m, s) => Math.max(m, s.score), 0);
    const allReasons = [...new Set(clusterScores.flatMap((s) => s.reasons))];

    clusters.push({
      id: makeId(),
      type: classifyCluster(maxScore, allReasons),
      imageIds: members,
      confidence: maxScore,
      reasoning: allReasons.join("; "),
    });
  }

  return clusters.sort((a, b) => b.confidence - a.confidence);
}

export const CLUSTER_TYPE_LABELS: Record<DuplicateCluster["type"], string> = {
  exact: "Exact Duplicate",
  near_duplicate: "Near Duplicate",
  edited: "Edited Version",
  burst: "Burst Photo",
  similar_content: "Similar Content",
};

export const CLUSTER_TYPE_COLORS: Record<DuplicateCluster["type"], string> = {
  exact: "#EF4444",
  near_duplicate: "#F59E0B",
  edited: "#8B5CF6",
  burst: "#0EA5E9",
  similar_content: "#10B981",
};
