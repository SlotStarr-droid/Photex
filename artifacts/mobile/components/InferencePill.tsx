import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CorrectionModal } from "@/components/CorrectionModal";
import { useColors } from "@/hooks/useColors";
import type { Inference } from "@/types/image";
import { confidenceColor } from "@/utils/analyze";

interface Props {
  inference: Inference;
  imageId: string;
}

export function InferencePill({ inference, imageId }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const color = confidenceColor(inference.confidence);
  const pct = Math.round(inference.confidence * 100);

  return (
    <>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <View style={styles.header}>
          <View style={styles.left}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>
              {inference.attribute}
            </Text>
            <Text style={[styles.value, { color: colors.foreground }]}>{inference.value}</Text>
          </View>
          <View style={styles.right}>
            <View style={[styles.badge, { backgroundColor: color + "20" }]}>
              <Text style={[styles.pct, { color }]}>{pct}%</Text>
            </View>
            <Text style={[styles.inferred, { color: colors.inferred }]}>INFERRED</Text>
          </View>
        </View>
        {expanded && (
          <View style={[styles.reasoning, { borderTopColor: colors.border }]}>
            <Text style={[styles.reasoningText, { color: colors.mutedForeground }]}>
              {inference.reasoning}
            </Text>
            <TouchableOpacity
              style={[styles.correctBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              onPress={(e) => { e.stopPropagation(); setCorrecting(true); }}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={12} color={colors.mutedForeground} />
              <Text style={[styles.correctText, { color: colors.mutedForeground }]}>
                Correct this inference
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Pressable>

      <CorrectionModal
        imageId={imageId}
        attribute={inference.attribute}
        originalValue={inference.value}
        visible={correcting}
        onClose={() => setCorrecting(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  left: { flex: 1, gap: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  inferred: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  reasoning: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  reasoningText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  correctBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  correctText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
