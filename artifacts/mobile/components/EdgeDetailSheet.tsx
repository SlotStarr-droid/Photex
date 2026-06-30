import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { GraphEdge, StoredImage } from "@/types/image";
import { EDGE_COLORS, RELATION_LABELS } from "@/utils/graph";

interface Props {
  edge: GraphEdge;
  images: StoredImage[];
  onClose: () => void;
  onNavigate: (imageId: string) => void;
}

export function EdgeDetailSheet({ edge, images, onClose, onNavigate }: Props) {
  const colors = useColors();
  const color = EDGE_COLORS[edge.evidenceType];
  const pct = Math.round(edge.confidence * 100);
  const srcImage = images.find((i) => i.id === edge.sourceId);
  const tgtImage = images.find((i) => i.id === edge.targetId);

  return (
    <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      {/* Handle */}
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeBadge, { backgroundColor: color + "20" }]}>
            <View style={[styles.typeDot, { backgroundColor: color }]} />
            <Text style={[styles.typeLabel, { color }]}>
              {edge.evidenceType === "verified" ? "VERIFIED" : "INFERRED"}
            </Text>
          </View>
          <Text style={[styles.relationLabel, { color: colors.foreground }]}>
            {RELATION_LABELS[edge.relationType] ?? edge.label}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Confidence bar */}
      <View style={styles.confidenceRow}>
        <Text style={[styles.confidenceLabel, { color: colors.mutedForeground }]}>
          Confidence
        </Text>
        <View style={[styles.bar, { backgroundColor: colors.secondary }]}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%` as `${number}%`, backgroundColor: color },
            ]}
          />
        </View>
        <Text style={[styles.confidencePct, { color }]}>{pct}%</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
        {/* Image pair */}
        <View style={styles.imagePair}>
          {[srcImage, tgtImage].map((img, i) => (
            img ? (
              <TouchableOpacity
                key={i}
                style={styles.imagePairItem}
                onPress={() => { onClose(); onNavigate(img.id); }}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: img.uri }}
                  style={styles.pairImage}
                  contentFit="cover"
                />
                <Text
                  style={[styles.pairLabel, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {img.metadata.fileName ?? "Image"}
                </Text>
              </TouchableOpacity>
            ) : null
          ))}
        </View>

        {/* Evidence items */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Evidence</Text>
        {edge.evidence.map((ev, i) => (
          <View
            key={i}
            style={[styles.evidenceRow, { borderColor: colors.border }]}
          >
            <View
              style={[
                styles.evidenceIcon,
                {
                  backgroundColor: ev.verified
                    ? colors.verifiedBg
                    : colors.inferredBg,
                },
              ]}
            >
              <Feather
                name={ev.verified ? "check-circle" : "alert-circle"}
                size={13}
                color={ev.verified ? colors.verified : colors.inferred}
              />
            </View>
            <Text style={[styles.evidenceText, { color: colors.foreground }]}>
              {ev.item}
            </Text>
          </View>
        ))}

        {/* Reasoning */}
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 14 }]}>
          Why the AI made this connection
        </Text>
        <View style={[styles.reasoningBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Text style={[styles.reasoningText, { color: colors.foreground }]}>
            {edge.reasoning}
          </Text>
        </View>

        {edge.evidenceType === "inferred" && (
          <View style={[styles.disclaimer, { backgroundColor: colors.inferredBg, borderColor: colors.inferred + "40" }]}>
            <Feather name="info" size={13} color={colors.inferred} />
            <Text style={[styles.disclaimerText, { color: colors.inferred }]}>
              This is an AI inference, not a confirmed fact. The connection may be coincidental. Review the evidence before drawing conclusions.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: "65%",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: { flex: 1, gap: 4 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  relationLabel: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  closeBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  confidenceLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 75 },
  bar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 3 },
  confidencePct: { fontSize: 13, fontFamily: "Inter_700Bold", width: 36, textAlign: "right" },
  scroll: { flex: 1 },
  imagePair: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  imagePairItem: { flex: 1, gap: 4 },
  pairImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: "#1a1a1a",
  },
  pairLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  evidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  evidenceIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  reasoningBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  reasoningText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
