import { Feather } from "@expo/vector-icons";
import React, { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BatchReportModal } from "@/components/BatchReportModal";
import { ModelSelector } from "@/components/ModelSelector";
import { PipelineJobCard } from "@/components/PipelineJobCard";
import { PromptTemplatePicker } from "@/components/PromptTemplatePicker";
import { useImages } from "@/context/ImageContext";
import { usePipeline } from "@/context/PipelineContext";
import { useColors } from "@/hooks/useColors";
import { BUILT_IN_TEMPLATES } from "@/utils/prompts";

type FilterTab = "all" | "queued" | "running" | "completed" | "failed";

export default function PipelineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { images } = useImages();
  const {
    queue,
    pipelineStatus,
    selectedTemplateId,
    selectedModel,
    setSelectedTemplate,
    setSelectedModel,
    enqueue,
    removeJob,
    retryJob,
    pausePipeline,
    resumePipeline,
    clearCompleted,
    cancelAll,
    buildReport,
    queuedCount,
    runningCount,
    completedCount,
    failedCount,
  } = usePipeline();

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showReport, setShowReport] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Unanalyzed images
  const unanalyzedImages = useMemo(
    () => images.filter((img) => !img.analysis || img.status === "error"),
    [images],
  );

  // Images currently in queue (queued or running)
  const queuedImageIds = useMemo(
    () =>
      new Set(
        queue
          .filter((j) => j.status === "queued" || j.status === "running")
          .map((j) => j.imageId),
      ),
    [queue],
  );

  // Prioritized unanalyzed (not already in queue)
  const priorityImages = useMemo(
    () => unanalyzedImages.filter((img) => !queuedImageIds.has(img.id)),
    [unanalyzedImages, queuedImageIds],
  );

  // All images not in queue
  const reanalyzableImages = useMemo(
    () => images.filter((img) => !queuedImageIds.has(img.id)),
    [images, queuedImageIds],
  );

  const filtered = useMemo(() => {
    if (filterTab === "all") return queue;
    return queue.filter((j) => j.status === filterTab);
  }, [queue, filterTab]);

  const isRunning = pipelineStatus === "running";
  const isPaused = pipelineStatus === "paused";

  const FILTER_TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: queue.length },
    { key: "queued", label: "Queued", count: queuedCount },
    { key: "running", label: "Running", count: runningCount },
    { key: "completed", label: "Done", count: completedCount },
    { key: "failed", label: "Failed", count: failedCount },
  ];

  const handleAddUnanalyzed = () => {
    enqueue(
      priorityImages.map((i) => i.id),
      selectedTemplateId,
      selectedModel,
      true,
    );
    setShowAddMenu(false);
  };

  const handleReanalyzeAll = () => {
    enqueue(
      reanalyzableImages.map((i) => i.id),
      selectedTemplateId,
      selectedModel,
    );
    setShowAddMenu(false);
  };

  const handleReanalyzeSelected = (imageId: string) => {
    enqueue([imageId], selectedTemplateId, selectedModel);
  };

  const ListHeader = () => (
    <View>
      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "Queued", count: queuedCount, color: "#94A3B8" },
          { label: "Running", count: runningCount, color: colors.primary },
          { label: "Done", count: completedCount, color: "#10B981" },
          { label: "Failed", count: failedCount, color: "#EF4444" },
        ].map((s) => (
          <View
            key={s.label}
            style={[
              styles.statBox,
              { backgroundColor: s.color + "18" },
            ]}
          >
            <Text style={[styles.statNum, { color: s.color }]}>
              {s.count}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Controls */}
      <View style={[styles.controls, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={isRunning ? pausePipeline : resumePipeline}
          style={({ pressed }) => [
            styles.ctrlBtn,
            {
              backgroundColor: isRunning ? "#F59E0B" : colors.primary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name={isPaused ? "play" : "play"} size={14} color="#fff" />
          )}
          <Text style={styles.ctrlBtnText}>
            {isRunning ? "Pause" : isPaused ? "Resume" : "Start"}
          </Text>
        </Pressable>

        {completedCount > 0 && (
          <Pressable
            onPress={clearCompleted}
            style={({ pressed }) => [
              styles.ctrlBtnSecondary,
              { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="check" size={14} color={colors.mutedForeground} />
            <Text style={[styles.ctrlBtnSecText, { color: colors.mutedForeground }]}>
              Clear done
            </Text>
          </Pressable>
        )}

        {(queuedCount > 0 || runningCount > 0) && (
          <Pressable
            onPress={cancelAll}
            style={({ pressed }) => [
              styles.ctrlBtnSecondary,
              { borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Feather name="x" size={14} color="#EF4444" />
            <Text style={[styles.ctrlBtnSecText, { color: "#EF4444" }]}>
              Cancel all
            </Text>
          </Pressable>
        )}
      </View>

      {/* Template picker */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          PROMPT TEMPLATE
        </Text>
        <PromptTemplatePicker
          templates={BUILT_IN_TEMPLATES}
          selectedId={selectedTemplateId}
          onSelect={setSelectedTemplate}
        />
      </View>

      {/* Model selector */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          AI MODEL
        </Text>
        <View style={{ paddingHorizontal: 16 }}>
          <ModelSelector selected={selectedModel} onSelect={setSelectedModel} />
        </View>
      </View>

      {/* Quick add */}
      <View style={[styles.section, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ADD TO QUEUE
        </Text>
        <View style={styles.addRow}>
          {priorityImages.length > 0 && (
            <Pressable
              onPress={handleAddUnanalyzed}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: "#10B98118",
                  borderColor: "#10B98140",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="zap" size={14} color="#10B981" />
              <Text style={[styles.addBtnText, { color: "#10B981" }]}>
                {priorityImages.length} unanalyzed
              </Text>
            </Pressable>
          )}
          {reanalyzableImages.length > 0 && (
            <Pressable
              onPress={handleReanalyzeAll}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: colors.primary + "18",
                  borderColor: colors.primary + "40",
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.addBtnText, { color: colors.primary }]}>
                Re-analyze {reanalyzableImages.length}
              </Text>
            </Pressable>
          )}
          {images.length === 0 && (
            <Text
              style={[styles.emptyHint, { color: colors.mutedForeground }]}
            >
              Add images to your Library first
            </Text>
          )}
        </View>
      </View>

      {/* Individual image add */}
      {images.length > 0 && (
        <View style={[styles.section, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => setShowAddMenu((v) => !v)}
            style={[styles.sectionToggle]}
          >
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              INDIVIDUAL IMAGES
            </Text>
            <Feather
              name={showAddMenu ? "chevron-up" : "chevron-down"}
              size={14}
              color={colors.mutedForeground}
            />
          </Pressable>

          {showAddMenu && (
            <View style={{ gap: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
              {images.map((img) => {
                const inQ = queuedImageIds.has(img.id);
                return (
                  <View
                    key={img.id}
                    style={[
                      styles.imgRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.imgName,
                          { color: colors.foreground },
                        ]}
                        numberOfLines={1}
                      >
                        {img.metadata.fileName ?? `Image ${img.id.slice(-6)}`}
                      </Text>
                      <Text
                        style={[
                          styles.imgStatus,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {inQ
                          ? "In queue"
                          : img.analysis
                          ? `Analyzed · ${img.analysis.model ?? "gpt-4o"}`
                          : "Not analyzed"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() =>
                        inQ ? undefined : handleReanalyzeSelected(img.id)
                      }
                      disabled={inQ}
                      style={({ pressed }) => [
                        styles.addImgBtn,
                        {
                          backgroundColor: inQ
                            ? colors.mutedForeground + "20"
                            : colors.primary,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name={inQ ? "clock" : "plus"}
                        size={13}
                        color={inQ ? colors.mutedForeground : "#fff"}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Filter tabs */}
      {queue.length > 0 && (
        <View
          style={[
            styles.filterRow,
            { borderBottomColor: colors.border },
          ]}
        >
          {FILTER_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setFilterTab(tab.key)}
              style={[
                styles.filterTab,
                filterTab === tab.key && {
                  borderBottomWidth: 2,
                  borderBottomColor: colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  {
                    color:
                      filterTab === tab.key
                        ? colors.primary
                        : colors.mutedForeground,
                    fontFamily:
                      filterTab === tab.key
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                  },
                ]}
              >
                {tab.label}
                {tab.count > 0 ? ` ${tab.count}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Pipeline
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {queue.length === 0
              ? "No jobs yet"
              : `${queue.length} job${queue.length !== 1 ? "s" : ""} · ${
                  isRunning ? "Running" : isPaused ? "Paused" : "Idle"
                }`}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowReport(true)}
          disabled={completedCount === 0}
          style={({ pressed }) => [
            styles.reportBtn,
            {
              backgroundColor:
                completedCount > 0
                  ? colors.primary + "18"
                  : colors.mutedForeground + "10",
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather
            name="file-text"
            size={15}
            color={completedCount > 0 ? colors.primary : colors.mutedForeground}
          />
          <Text
            style={[
              styles.reportBtnText,
              {
                color:
                  completedCount > 0
                    ? colors.primary
                    : colors.mutedForeground,
              },
            ]}
          >
            Report
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
          ...(filtered.length === 0 ? {} : { paddingHorizontal: 16, paddingTop: 12 }),
        }}
        renderItem={({ item }) => (
          <PipelineJobCard
            job={item}
            image={images.find((i) => i.id === item.imageId)}
            onRetry={retryJob}
            onRemove={removeJob}
          />
        )}
        ListEmptyComponent={
          queue.length > 0 ? (
            <View style={styles.emptyState}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                No {filterTab === "all" ? "" : filterTab} jobs
              </Text>
            </View>
          ) : null
        }
      />

      <BatchReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        jobs={queue}
        images={images}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  reportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  reportBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  statNum: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  controls: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
  },
  ctrlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    minWidth: 90,
  },
  ctrlBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  ctrlBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  ctrlBtnSecText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  section: {
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
  },
  sectionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  addRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  emptyHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  imgRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  imgName: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  imgStatus: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  addImgBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabText: {
    fontSize: 12,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
