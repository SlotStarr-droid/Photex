import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string;
  verified?: boolean;
}

export function MetadataRow({ label, value, verified = true }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.right}>
        <Text style={[styles.value, { color: colors.foreground }]} numberOfLines={2}>
          {value}
        </Text>
        <View
          style={[
            styles.tag,
            { backgroundColor: verified ? colors.verifiedBg : colors.inferredBg },
          ]}
        >
          <Text
            style={[
              styles.tagText,
              { color: verified ? colors.verified : colors.inferred },
            ]}
          >
            {verified ? "VERIFIED" : "INFERRED"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  right: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    flexWrap: "wrap",
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    flexShrink: 1,
  },
  tag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});
