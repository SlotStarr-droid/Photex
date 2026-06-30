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
import type { ImageMetadata, StoredImage } from "@/types/image";
import { analyzeImage, generateId } from "@/utils/analyze";
import { parseExif } from "@/utils/exif";

export default function ImportScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addImage, updateImage } = useImages();
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Importing…");
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const buildMetadata = (
    asset: ImagePicker.ImagePickerAsset,
  ): ImageMetadata => {
    const parsed = parseExif(
      asset.exif as Record<string, unknown> | null | undefined,
    );
    return {
      width: asset.width,
      height: asset.height,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileName: asset.fileName ?? undefined,
      // GPS from real EXIF
      gpsLatitude: parsed.gps?.latitude,
      gpsLongitude: parsed.gps?.longitude,
      // Device from real EXIF
      deviceMake: parsed.deviceMake,
      deviceModel: parsed.deviceModel,
      // Timestamp from real EXIF DateTimeOriginal, fallback to now
      creationTime: parsed.capturedAt ?? new Date().toISOString(),
      // Full raw EXIF for reference
      exif: (asset.exif as Record<string, unknown>) ?? undefined,
    };
  };

  const processAssets = async (
    assets: ImagePicker.ImagePickerAsset[],
    source: "camera" | "gallery",
  ) => {
    setLoading(true);
    setError(null);

    const isBatch = assets.length > 1;

    try {
      if (isBatch) {
        // For batch: add all images first, then navigate to library
        const ids: string[] = [];

        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i]!;
          setLoadingMsg(`Adding ${i + 1} of ${assets.length}…`);

          const id = generateId();
          ids.push(id);

          const image: StoredImage = {
            id,
            uri: asset.uri,
            metadata: buildMetadata(asset),
            status: "pending",
            addedAt: new Date().toISOString(),
            source,
          };

          await addImage(image);
        }

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        router.back();

        // Kick off analysis for each in background (no await)
        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i]!;
          const id = ids[i]!;
          await updateImage(id, { status: "analyzing" });
          analyzeImage(asset.uri, asset.mimeType ?? "image/jpeg")
            .then((analysis) =>
              updateImage(id, { status: "complete", analysis }),
            )
            .catch((err) =>
              updateImage(id, {
                status: "error",
                error: err instanceof Error ? err.message : "Analysis failed",
              }),
            );
        }
      } else {
        // Single image: navigate to detail screen immediately
        const asset = assets[0]!;
        setLoadingMsg("Importing…");

        const id = generateId();
        const image: StoredImage = {
          id,
          uri: asset.uri,
          metadata: buildMetadata(asset),
          status: "analyzing",
          addedAt: new Date().toISOString(),
          source,
        };

        await addImage(image);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        router.back();
        router.push({ pathname: "/detail", params: { id } });

        try {
          setLoadingMsg("Running AI analysis…");
          const analysis = await analyzeImage(
            asset.uri,
            asset.mimeType ?? "image/jpeg",
          );
          await updateImage(id, { status: "complete", analysis });
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        } catch (err) {
          await updateImage(id, {
            status: "error",
            error:
              err instanceof Error ? err.message : "Analysis failed",
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import image");
    } finally {
      setLoading(false);
      setLoadingMsg("Importing…");
    }
  };

  const handleCamera = async () => {
    setError(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError(
        "Camera permission denied. Please enable it in Settings → Permissions.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      quality: 0.9,
      exif: true,
      base64: false,
    });
    if (result.canceled || !result.assets?.length) return;
    await processAssets(result.assets, "camera");
  };

  const handleGallery = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(
        "Photo library permission denied. Please enable it in Settings → Permissions.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      quality: 0.9,
      exif: true,
      base64: false,
      allowsMultipleSelection: true,
      selectionLimit: 20,
    });
    if (result.canceled || !result.assets?.length) return;
    await processAssets(result.assets, "gallery");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>
          Add Image
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 32 },
        ]}
      >
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Choose a source. EXIF metadata (GPS, device, timestamp) is extracted
          automatically. AI analysis runs immediately.
        </Text>

        {error && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: colors.lowConfidenceBg,
                borderColor: colors.destructive + "40",
              },
            ]}
          >
            <Feather name="alert-circle" size={15} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.optionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => void handleCamera()}
          activeOpacity={0.85}
          disabled={loading}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Feather name="camera" size={28} color={colors.primary} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: colors.foreground }]}>
              Take Photo
            </Text>
            <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
              Capture a new image with your device camera
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => void handleGallery()}
          activeOpacity={0.85}
          disabled={loading}
        >
          <View
            style={[styles.iconCircle, { backgroundColor: colors.accent }]}
          >
            <Feather name="image" size={28} color={colors.accentForeground} />
          </View>
          <View style={styles.optionText}>
            <Text style={[styles.optionTitle, { color: colors.foreground }]}>
              Choose from Gallery
            </Text>
            <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
              Select up to 20 existing photos — all analyzed automatically
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              {loadingMsg}
            </Text>
          </View>
        )}

        {/* What gets extracted */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>
            Automatically extracted
          </Text>
          {[
            { icon: "map-pin", label: "GPS coordinates (if embedded in EXIF)" },
            { icon: "smartphone", label: "Device make & model from EXIF" },
            { icon: "clock", label: "Original capture timestamp" },
            { icon: "eye", label: "AI scene, objects, text & inferences" },
          ].map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <Feather
                name={row.icon as React.ComponentProps<typeof Feather>["name"]}
                size={13}
                color={colors.primary}
              />
              <Text
                style={[styles.infoText, { color: colors.mutedForeground }]}
              >
                {row.label}
              </Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.privacyNote,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="lock" size={14} color={colors.mutedForeground} />
          <Text style={[styles.privacyText, { color: colors.mutedForeground }]}>
            Images are stored locally on your device using encrypted AsyncStorage.
            The only external request made is the AI analysis call to OpenAI.
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 14 },
  desc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 4,
  },
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
    borderWidth: StyleSheet.hairlineWidth,
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
  infoCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
