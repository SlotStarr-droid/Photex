import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ImageCard } from "@/components/ImageCard";
import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";
import { ONBOARDING_KEY } from "@/app/onboarding";

const { width } = Dimensions.get("window");
const COLS = 3;
const GAP = 3;
const CARD_SIZE = (width - GAP * (COLS + 1)) / COLS;

export default function LibraryScreen() {
  const colors = useColors();
  const { images } = useImages();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  // Check onboarding on first mount
  useEffect(() => {
    const check = async () => {
      try {
        const val = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (val !== "true") {
          router.replace("/onboarding");
        }
      } catch {
        // ignore — don't block on error
      }
    };
    void check();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return images;
    const q = query.toLowerCase();
    return images.filter((img) => {
      const tags = img.analysis?.tags?.join(" ") ?? "";
      const desc = img.analysis?.description ?? "";
      const scene = img.analysis?.scene?.type ?? "";
      const fileName = img.metadata.fileName ?? "";
      return (
        tags.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        scene.toLowerCase().includes(q) ||
        fileName.toLowerCase().includes(q)
      );
    });
  }, [images, query]);

  const stats = useMemo(() => {
    const complete = images.filter((i) => i.status === "complete").length;
    const analyzing = images.filter(
      (i) => i.status === "analyzing" || i.status === "pending",
    ).length;
    return { complete, analyzing, total: images.length };
  }, [images]);

  const handleImport = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/import");
  };

  const handleSettings = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/privacy");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
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
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Library
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {stats.total} image{stats.total !== 1 ? "s" : ""}
              {stats.analyzing > 0 ? ` · ${stats.analyzing} analyzing` : ""}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: colors.secondary },
              ]}
              onPress={handleSettings}
              activeOpacity={0.8}
            >
              <Feather name="settings" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleImport}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by tag, scene, content…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.grid,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 90),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="image" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {images.length === 0 ? "No images yet" : "No results"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {images.length === 0
                ? "Tap + to add your first image"
                : "Try a different search term"}
            </Text>
            {images.length === 0 && (
              <TouchableOpacity
                style={[
                  styles.emptyBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleImport}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.emptyBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Add Image
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.gridInner}>
            {filtered.map((img) => (
              <ImageCard key={img.id} image={img} size={CARD_SIZE} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  grid: { padding: GAP },
  gridInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
