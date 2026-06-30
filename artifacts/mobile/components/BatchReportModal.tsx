import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import type { ProcessingJob, StoredImage } from "@/types/image";
import { getTemplateById } from "@/utils/prompts";

interface Props {
  visible: boolean;
  onClose: () => void;
  jobs: ProcessingJob[];
  images: StoredImage[];
}

function buildReport(jobs: ProcessingJob[], images: StoredImage[]): string {
  const completed = jobs.filter((j) => j.status === "completed");
  const failed = jobs.filter((j) => j.status === "failed");
  const queued = jobs.filter((j) => j.status === "queued");

  const durations = completed
    .filter((j) => j.startedAt && j.completedAt)
    .map((j) =>
      new Date(j.completedAt!).getTime() - new Date(j.startedAt!).getTime()
    );
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 1000)
      : 0;

  const templateBreakdown: Record<string, number> = {};
  const modelBreakdown: Record<string, number> = {};
  for (const j of jobs) {
    templateBreakdown[j.templateId] = (templateBreakdown[j.templateId] ?? 0) + 1;
    modelBreakdown[j.modelVersion] = (modelBreakdown[j.modelVersion] ?? 0) + 1;
  }

  const lines: string[] = [
    `# AI Processing Pipeline Report`,
    `Generated: ${new Date().toLocaleString()}`,
    ``,
    `## Summary`,
    `Total Jobs: ${jobs.length}`,
    `Completed:  ${completed.length}`,
    `Failed:     ${failed.length}`,
    `Queued:     ${queued.length}`,
    `Avg Duration: ${avgDuration}s`,
    ``,
    `## By Template`,
    ...Object.entries(templateBreakdown).map(
      ([id, count]) => `  ${getTemplateById(id).name}: ${count}`
    ),
    ``,
    `## By Model`,
    ...Object.entries(modelBreakdown).map(
      ([model, count]) => `  ${model}: ${count}`
    ),
    ``,
    `## Completed Jobs`,
  ];

  for (const j of completed) {
    const img = images.find((i) => i.id === j.imageId);
    const name = img?.metadata.fileName ?? `Image ${j.imageId.slice(-6)}`;
    const template = getTemplateById(j.templateId);
    const dur =
      j.startedAt && j.completedAt
        ? `${Math.round(
            (new Date(j.completedAt).getTime() -
              new Date(j.startedAt).getTime()) /
              1000
          )}s`
        : "—";

    lines.push(`  ✓ ${name} [${template.name} / ${j.modelVersion}] — ${dur}`);

    if (img?.analysis) {
      lines.push(`    Scene: ${img.analysis.scene.type} (${Math.round(img.analysis.scene.confidence * 100)}%)`);
      lines.push(`    Tags: ${img.analysis.tags.slice(0, 5).join(", ")}`);
      if (img.analysis.inferences.length > 0) {
        lines.push(`    Top inference: ${img.analysis.inferences[0]!.attribute} → ${img.analysis.inferences[0]!.value} (${Math.round(img.analysis.inferences[0]!.confidence * 100)}%)`);
      }
    }
  }

  if (failed.length > 0) {
    lines.push(``, `## Failed Jobs`);
    for (const j of failed) {
      const img = images.find((i) => i.id === j.imageId);
      const name = img?.metadata.fileName ?? `Image ${j.imageId.slice(-6)}`;
      lines.push(`  ✗ ${name} — ${j.error ?? "Unknown error"}`);
    }
  }

  return lines.join("\n");
}

export function BatchReportModal({ visible, onClose, jobs, images }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const report = buildReport(jobs, images);

  const handleShare = async () => {
    try {
      await Share.share({ message: report, title: "AI Pipeline Report" });
    } catch {
      // ignore
    }
  };

  const completed = jobs.filter((j) => j.status === "completed").length;
  const failed = jobs.filter((j) => j.status === "failed").length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, paddingTop: insets.top + 8 },
        ]}
      >
        <View
          style={[styles.header, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Batch Report
          </Text>
          <View style={styles.headerRight}>
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.shareBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Feather name="share" size={14} color="#fff" />
              <Text style={styles.shareBtnText}>Export</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { opacity: pressed ? 0.5 : 1 },
              ]}
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View
            style={[styles.statBox, { backgroundColor: "#10B98120" }]}
          >
            <Text style={[styles.statNum, { color: "#10B981" }]}>
              {completed}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Done
            </Text>
          </View>
          <View
            style={[styles.statBox, { backgroundColor: "#EF444420" }]}
          >
            <Text style={[styles.statNum, { color: "#EF4444" }]}>
              {failed}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Failed
            </Text>
          </View>
          <View
            style={[
              styles.statBox,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {jobs.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              Total
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        >
          <View
            style={[
              styles.reportBox,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[styles.reportText, { color: colors.foreground }]}
              selectable
            >
              {report}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  statNum: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  scroll: { flex: 1 },
  reportBox: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  reportText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
