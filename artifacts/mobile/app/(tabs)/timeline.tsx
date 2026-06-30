import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";
import { buildTimeline, getSourceLabel } from "@/utils/timeline";

export default function TimelineScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { images } = useImages();
  const router = useRouter();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const timeline = useMemo(() => buildTimeline(images), [images]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Timeline</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {images.length} image{images.length !== 1 ? "s" : ""} across {timeline.length} day
          {timeline.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {timeline.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="clock" size={48} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No images yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add images to see your timeline
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          {timeline.map((day, dayIdx) => (
            <View key={day.dateKey} style={styles.dayGroup}>
              {/* Day header */}
              <View style={styles.dayHeader}>
                <View style={[styles.dayLine, { backgroundColor: colors.border }]} />
                <View
                  style={[
                    styles.dayBadge,
                    { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" },
                  ]}
                >
                  <Text style={[styles.dayLabel, { color: colors.primary }]}>
                    {day.dateLabel}
                  </Text>
                </View>
                <View style={[styles.dayLine, { backgroundColor: colors.border }]} />
              </View>

              {/* Events */}
              {day.events.map((ev, evIdx) => {
                const img = images.find((i) => i.id === ev.imageId);
                if (!img) return null;
                const isLast =
                  evIdx === day.events.length - 1 && dayIdx === timeline.length - 1;

                return (
                  <View key={ev.imageId} style={styles.eventRow}>
                    {/* Timeline spine */}
                    <View style={styles.spine}>
                      <View
                        style={[
                          styles.spineDot,
                          {
                            backgroundColor: ev.timestampVerified
                              ? colors.verified
                              : colors.inferred,
                            borderColor: colors.background,
                          },
                        ]}
                      />
                      {!isLast && (
                        <View
                          style={[
                            styles.spineConnector,
                            {
                              backgroundColor: ev.timestampVerified
                                ? colors.verified + "40"
                                : colors.border,
                              borderStyle: ev.timestampVerified ? "solid" : "dashed",
                            },
                          ]}
                        />
                      )}
                    </View>

                    {/* Card */}
                    <TouchableOpacity
                      style={[
                        styles.eventCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() =>
                        router.push({ pathname: "/detail", params: { id: img.id } })
                      }
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.eventImage}
                        contentFit="cover"
                      />

                      <View style={styles.eventContent}>
                        {/* Timestamp */}
                        <View style={styles.timestampRow}>
                          <View
                            style={[
                              styles.tsBadge,
                              {
                                backgroundColor: ev.timestampVerified
                                  ? colors.verifiedBg
                                  : colors.inferredBg,
                              },
                            ]}
                          >
                            <Feather
                              name={ev.timestampVerified ? "check-circle" : "clock"}
                              size={10}
                              color={
                                ev.timestampVerified ? colors.verified : colors.inferred
                              }
                            />
                            <Text
                              style={[
                                styles.tsBadgeText,
                                {
                                  color: ev.timestampVerified
                                    ? colors.verified
                                    : colors.inferred,
                                },
                              ]}
                            >
                              {ev.timestampVerified ? "VERIFIED" : "INFERRED"}
                            </Text>
                          </View>
                          <Text
                            style={[styles.timeText, { color: colors.foreground }]}
                          >
                            {ev.timeLabel}
                          </Text>
                          {!ev.timestampVerified && (
                            <Text
                              style={[
                                styles.confText,
                                { color: colors.mutedForeground },
                              ]}
                            >
                              {Math.round(ev.confidence * 100)}% conf.
                            </Text>
                          )}
                        </View>

                        {/* Description */}
                        {img.analysis?.description && (
                          <Text
                            style={[styles.desc, { color: colors.foreground }]}
                            numberOfLines={2}
                          >
                            {img.analysis.description}
                          </Text>
                        )}

                        {/* Source */}
                        <View style={styles.sourceRow}>
                          <Feather
                            name={img.source === "camera" ? "camera" : "image"}
                            size={11}
                            color={colors.mutedForeground}
                          />
                          <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>
                            {getSourceLabel(img.source, img.sourceEvidence?.determinedBy)}
                          </Text>
                        </View>

                        {/* Tags */}
                        {img.analysis?.tags && img.analysis.tags.length > 0 && (
                          <View style={styles.tagRow}>
                            {img.analysis.tags.slice(0, 3).map((tag) => (
                              <View
                                key={tag}
                                style={[
                                  styles.tag,
                                  {
                                    backgroundColor: colors.secondary,
                                    borderColor: colors.border,
                                  },
                                ]}
                              >
                                <Text
                                  style={[styles.tagText, { color: colors.secondaryForeground }]}
                                >
                                  {tag}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  scroll: { padding: 16 },
  dayGroup: { marginBottom: 8 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  dayLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  eventRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  spine: { width: 20, alignItems: "center", paddingTop: 16 },
  spineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  spineConnector: {
    flex: 1,
    width: 2,
    marginTop: 4,
    borderLeftWidth: 2,
  },
  eventCard: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    gap: 0,
  },
  eventImage: {
    width: 88,
    height: 88,
    backgroundColor: "#1a1a1a",
  },
  eventContent: {
    flex: 1,
    padding: 10,
    gap: 5,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  tsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tsBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  timeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  confText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  desc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  sourceText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tagRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontFamily: "Inter_500Medium" },
});
