import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import type { StoredImage } from "@/types/image";
import { analyzeImage, generateId } from "@/utils/analyze";

export default function ImportScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addImage, updateImage } = useImages();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handlePick = async (source: "camera" | "gallery") => {
    setError(null);
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setError("Camera permission denied. Please enable it in Settings.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          quality: 0.85,
          exif: true,
          base64: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setError("Photo library permission denied. Please enable it in Settings.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          quality: 0.85,
          exif: true,
          base64: false,
          allowsMultipleSelection: false,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setLoading(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const id = generateId();
      const image: StoredImage = {
        id,
        uri: asset.uri,
        metadata: {
          width: asset.width,
          height: asset.height,
          mimeType: asset.mimeType ?? "image/jpeg",
          fileName: asset.fileName ?? `image_${id}`,
          exif: asset.exif ?? undefined,
        },
        status: "analyzing",
        addedAt: new Date().toISOString(),
        source,
      };

      await addImage(image);
      router.back();
      router.push({ pathname: "/detail", params: { id } });

      try {
        const analysis = await analyzeImage(asset.uri, asset.mimeType ?? "image/jpeg");
        await updateImage(id, { status: "complete", analysis });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        await updateImage(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Analysis failed",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Add Image</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}>
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Choose a source to import an image. AI analysis runs immediately after import.
        </Text>

        {error && (
          <View style={[styles.errorBox, { backgroundColor: colors.lowConfidenceBg, borderColor: colors.destructive + "40" }]}>
            <Feather name="alert-circle" size={15} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => void handlePick("camera")}
          activeOpacity={0.85}
          disabled={loading}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="camera" size={28} color={colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: colors.foreground }]}>Take Photo</Text>
            <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
              Capture a new image with your camera
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => void handlePick("gallery")}
          activeOpacity={0.85}
          disabled={loading}
        >
          <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
            <Feather name="image" size={28} color={colors.accentForeground} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: colors.foreground }]}>Choose from Library</Text>
            <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
              Select an existing photo from your gallery
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Importing image…
            </Text>
          </View>
        )}

        <View style={[styles.privacyNote, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="lock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
            Images are stored locally on your device. AI analysis is the only external network request made.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 14 },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { flex: 1, gap: 3 },
  optionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  privacyText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
