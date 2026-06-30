import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ProcessingJob, StoredImage } from "@/types/image";
import { getTemplateById } from "@/utils/prompts";

interface Props {
  job: ProcessingJob;
  image?: StoredImage;
  onRetry?: (jobId: string) => void;
  onRemove?: (jobId: string) => void;
}

const STATUS_CONFIG = {
  queued: { icon: "clock" as const, label: "Queued", color: "#94A3B8" },
  running: { icon: "zap" as const, label: "Running", color: "#3B82F6" },
  completed: { icon: "check-circle" as const, label: "Done", color: "#10B981" },
  failed: { icon: "x-circle" as const, label: "Failed", color: "#EF4444" },
  cancelled: { icon: "slash" as const, label: "Cancelled", color: "#6B7280" },
};

export function PipelineJobCard({ job, image, onRetry, onRemove }: Props) {
  const colors = useColors();
  const cfg = STATUS_CONFIG[job.status];
  const template = getTemplateById(job.templateId);

  const duration =
    job.startedAt && job.completedAt
      ? Math.round(
          (new Date(job.completedAt).getTime() -
            new Date(job.startedAt).getTime()) /
            1000
        )
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor:
            job.status === "running"
              ? colors.primary + "60"
              : job.status === "failed"
              ? "#EF444440"
              : colors.border,
          borderWidth: job.status === "running" ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.left}>
          {job.status === "running" ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name={cfg.icon} size={16} color={cfg.color} />
          )}
          <View style={styles.meta}>
            <Text
              style={[styles.imageName, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {image?.metadata.fileName ?? `Image ${job.imageId.slice(-6)}`}
            </Text>
            <View style={styles.tags}>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>
                  {template.name}
                </Text>
              </View>
              <View
                style={[
                  styles.tag,
                  { backgroundColor: colors.mutedForeground + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {job.modelVersion}
                </Text>
              </View>
              {duration !== null && (
                <View
                  style={[
                    styles.tag,
                    { backgroundColor: colors.mutedForeground + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {duration}s
                  </Text>
                </View>
              )}
            </View>
            {job.status === "failed" && job.error && (
              <Text
                style={[styles.errorText, { color: "#EF4444" }]}
                numberOfLines={2}
              >
                {job.error}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: cfg.color + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
          {job.status === "failed" && onRetry && (
            <Pressable
              onPress={() => onRetry(job.id)}
              style={({ pressed }) => [
                styles.iconBtn,
                { opacity: pressed ? 0.5 : 1 },
              ]}
              accessibilityLabel="Retry job"
            >
              <Feather
                name="refresh-cw"
                size={14}
                color={colors.mutedForeground}
              />
            </Pressable>
          )}
          {(job.status === "queued" || job.status === "failed" || job.status === "cancelled") &&
            onRemove && (
              <Pressable
                onPress={() => onRemove(job.id)}
                style={({ pressed }) => [
                  styles.iconBtn,
                  { opacity: pressed ? 0.5 : 1 },
                ]}
                accessibilityLabel="Remove job"
              >
                <Feather
                  name="trash-2"
                  size={14}
                  color={colors.mutedForeground}
                />
              </Pressable>
            )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  meta: {
    flex: 1,
    gap: 4,
  },
  imageName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  actions: {
    alignItems: "flex-end",
    gap: 6,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
