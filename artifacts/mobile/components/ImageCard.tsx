import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { StoredImage } from "@/types/image";

interface Props {
  image: StoredImage;
  size: number;
}

export function ImageCard({ image, size }: Props) {
  const colors = useColors();
  const router = useRouter();

  const handlePress = () => {
    router.push({ pathname: "/detail", params: { id: image.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.card, { width: size, height: size }]}
    >
      <Image
        source={{ uri: image.uri }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      {image.status === "analyzing" && (
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.overlayText}>Analyzing…</Text>
        </View>
      )}

      {image.status === "error" && (
        <View style={[styles.overlay, { backgroundColor: "rgba(239,68,68,0.7)" }]}>
          <Feather name="alert-circle" size={18} color="#fff" />
        </View>
      )}

      {image.status === "complete" && image.analysis && (
        <View style={styles.tagRow}>
          {image.analysis.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.sourceDot, { backgroundColor: colors.primary }]}>
        <Feather
          name={image.source === "camera" ? "camera" : "image"}
          size={8}
          color="#fff"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  overlayText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  tagRow: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    gap: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_500Medium",
  },
  sourceDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
