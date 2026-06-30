import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { PromptTemplate } from "@/types/image";

interface Props {
  templates: PromptTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
}

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

export function PromptTemplatePicker({ templates, selectedId, onSelect }: Props) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {templates.map((t) => {
        const selected = t.id === selectedId;
        return (
          <Pressable
            key={t.id}
            onPress={() => onSelect(t.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected
                  ? colors.primary
                  : colors.card,
                borderColor: selected ? colors.primary : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Select ${t.name} template`}
            accessibilityState={{ selected }}
          >
            <Feather
              name={t.icon as FeatherIconName}
              size={14}
              color={selected ? "#fff" : colors.mutedForeground}
            />
            <View>
              <Text
                style={[
                  styles.chipLabel,
                  { color: selected ? "#fff" : colors.foreground },
                ]}
              >
                {t.name}
              </Text>
              <Text
                style={[
                  styles.chipDesc,
                  {
                    color: selected
                      ? "rgba(255,255,255,0.75)"
                      : colors.mutedForeground,
                  },
                ]}
                numberOfLines={1}
              >
                {t.description}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 200,
  },
  chipLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  chipDesc: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    maxWidth: 140,
  },
});
