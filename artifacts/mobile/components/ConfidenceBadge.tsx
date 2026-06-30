import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { confidenceColor, confidenceLabel } from "@/utils/analyze";

interface Props {
  confidence: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function ConfidenceBadge({ confidence, size = "sm", showLabel = true }: Props) {
  const colors = useColors();
  const color = confidenceColor(confidence);
  const label = confidenceLabel(confidence);
  const pct = Math.round(confidence * 100);

  return (
    <View style={[styles.badge, { backgroundColor: color + "20" }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      {showLabel && (
        <Text style={[styles.text, { color, fontSize: size === "sm" ? 10 : 12 }]}>
          {label} · {pct}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
});
