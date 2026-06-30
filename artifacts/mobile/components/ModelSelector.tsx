import React from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ModelVersion } from "@/types/image";

const MODELS: { value: ModelVersion; label: string; note: string }[] = [
  { value: "gpt-4o", label: "GPT-4o", note: "Highest accuracy" },
  { value: "gpt-4o-mini", label: "GPT-4o mini", note: "Faster & cheaper" },
];

interface Props {
  selected: ModelVersion;
  onSelect: (model: ModelVersion) => void;
}

export function ModelSelector({ selected, onSelect }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {MODELS.map((m, idx) => {
        const active = m.value === selected;
        return (
          <Pressable
            key={m.value}
            onPress={() => onSelect(m.value)}
            style={({ pressed }) => [
              styles.segment,
              idx === 0 && styles.segmentFirst,
              idx === MODELS.length - 1 && styles.segmentLast,
              active && { backgroundColor: colors.primary },
              !active && idx < MODELS.length - 1 && {
                borderRightWidth: StyleSheet.hairlineWidth,
                borderRightColor: colors.border,
              },
              { opacity: pressed ? 0.8 : 1 },
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={m.label}
          >
            <Text
              style={[
                styles.segLabel,
                { color: active ? "#fff" : colors.foreground },
              ]}
            >
              {m.label}
            </Text>
            <Text
              style={[
                styles.segNote,
                {
                  color: active
                    ? "rgba(255,255,255,0.75)"
                    : colors.mutedForeground,
                },
              ]}
            >
              {m.note}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  segmentFirst: {
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  segmentLast: {
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  segLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  segNote: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
