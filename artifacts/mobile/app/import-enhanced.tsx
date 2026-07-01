/**
 * Enhanced import flow demonstrating:
 * - Source detection with confidence scoring
 * - Placeholder flows for SMS/Email/Cloud imports
 * - Enhanced metadata extraction with hashes
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  buildEnhancedMetadata,
  inferSourceEvidence,
} from "@/utils/metadata";

export default function ImportEnhancedScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addImage, updateImage } = useImages();
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Importing…");
  const [error, setError] = useState<string | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const processAssets = async (
    assets: ImagePicker.ImagePickerAsset[],
    source: "camera" | "gallery",
  ) => {
    setLoading(true);
    setError(null);

    const isBatch = assets.length > 1;

    try {
      if (isBatch) {
        const ids: string[] = [];

        for (let i = 0; i < assets.length; i++) {
          const asset = assets[i]!;
          setLoadingMsg(`Adding ${i + 1} of ${assets.length}…`);

          const id = generateId();
          ids.push(id);

          const parsed = parseExif(
            asset.exif as Record<string, unknown> | null | undefined,
          );

          const metadata = await buildEnhancedMetadata(
            {
              width: asset.width,
              height: asset.height,
              mimeType: asset.mimeType ?? "image/jpeg",
              fileName: asset.fileName,
              exif: (asset.exif as Record<string, unknown>) ?? undefined,
              base64: asset.base64,
            },
            parsed,
          );

          // Infer source with confidence
          const sourceEvidence = inferSourceEvidence(
            metadata,
            asset.fileName,
            asset.fileSize,
          );

          const image: StoredImage = {
            id,
            uri: asset.uri,
            base64: asset.base64,
            metadata,
            status: "pending",
            addedAt: new Date().toISOString(),
            source: sourceEvidence.source,
            sourceEvidence,
            userLabels: [],
          };

          await addImage(image);
          await updateImage(id, { status: "analyzing" });

          try {
            const analysis = await analyzeImage(
              asset.uri,
              metadata.mimeType ?? "image/jpeg",
            );
            await updateImage(id, { status: "complete", analysis });
          } catch (err) {
            await updateImage(id, {
              status: "error",
              error: err instanceof Error ? err.message : "Analysis failed",
            });
          }
        }

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        router.push("/(tabs)");
      } else {
        // Single image flow
        const asset = assets[0]!;
        const id = generateId();

        const parsed = parseExif(
          asset.exif as Record<string, unknown> | null | undefined,
        );

        const metadata = await buildEnhancedMetadata(
          {
            width: asset.width,
            height: asset.height,
            mimeType: asset.mimeType ?? "image/jpeg",
            fileName: asset.fileName,
            exif: (asset.exif as Record<string, unknown>) ?? undefined,
            base64: asset.base64,
          },
          parsed,
        );

        const sourceEvidence = inferSourceEvidence(
          metadata,
          asset.fileName,
          asset.fileSize,
        );

        const image: StoredImage = {
          id,
          uri: asset.uri,
          base64: asset.base64,
          metadata,
          status: "analyzing",
          addedAt: new Date().toISOString(),
          source: sourceEvidence.source,
          sourceEvidence,
          userLabels: [],
        };

        await addImage(image);

        try {
          const analysis = await analyzeImage(
            asset.uri,
            metadata.mimeType ?? "image/jpeg",
          );
          await updateImage(id, { status: "complete", analysis });
        } catch (err) {
          await updateImage(id, {
            status: "error",
            error: err instanceof Error ? err.message : "Analysis failed",
          });
        }

        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        router.push(`/detail?id=${id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setError(msg);
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setError("Camera permission denied");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 1,
      exif: true,
    });

    if (!result.canceled) {
      await processAssets(result.assets, "camera");
    }
  };

  const handleGallery = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo library permission denied");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultiple: true,
      exif: true,
    });

    if (!result.canceled) {
      await processAssets(result.assets, "gallery");
    }
  };

  // Placeholder flows for future implementation
  const handleScreenshot = () => {
    Alert.alert(
      "Screenshots",
      "Screenshot import will be available in a future update. For now, save screenshots to your photo library.",
    );
  };

  const handleEmailImport = () => {
    Alert.alert(
      "Email Attachments",
      "Email attachment import requires additional setup. Coming soon!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Learn More",
          onPress: () => {
            // Future: open documentation
          },
        },
      ],
    );
  };

  const handleSmsImport = () => {
    Alert.alert(
      "SMS/MMS Attachments",
      "SMS/MMS attachment import requires additional permissions. Coming soon!",
    );
  };

  const handleCloudImport = () => {
    Alert.alert(
      "Cloud Storage",
      "Cloud storage integration (Google Drive, Dropbox, OneDrive) coming soon!",
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          {loadingMsg}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.title, { color: colors.foreground }]}>
          Import Media
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Add images from various sources
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.destructive + "20" },
            ]}
          >
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text
              style={[styles.errorText, { color: colors.destructive }]}
              numberOfLines={2}
            >
              {error}
            </Text>
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Verified Sources
        </Text>

        <TouchableOpacity
          style={[
            styles.importCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => void handleCamera()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconBg,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Feather name="camera" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Camera
            </Text>
            <Text
              style={[styles.cardDesc, { color: colors.mutedForeground }]}
            >
              Capture photos directly with full EXIF metadata
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.importCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => void handleGallery()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconBg,
              { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Feather name="image" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Photo Library
            </Text>
            <Text
              style={[styles.cardDesc, { color: colors.mutedForeground }]}
            >
              Import existing photos with metadata extraction
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, marginTop: 24 },
          ]}
        >
          Coming Soon
        </Text>

        <TouchableOpacity
          style={[
            styles.importCard,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: 0.6,
            },
          ]}
          onPress={() => handleScreenshot()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconBg,
              { backgroundColor: colors.mutedForeground + "20" },
            ]}
          >
            <Feather name="monitor" size={24} color={colors.mutedForeground} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Screenshots
            </Text>
            <Text
              style={[styles.cardDesc, { color: colors.mutedForeground }]}
            >
              Import and analyze screenshots with source detection
            </Text>
          </View>
          <Feather
            name="lock"
            size={20}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.importCard,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: 0.6,
            },
          ]}
          onPress={() => handleEmailImport()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconBg,
              { backgroundColor: colors.mutedForeground + "20" },
            ]}
          >
            <Feather name="mail" size={24} color={colors.mutedForeground} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Email Attachments
            </Text>
            <Text
              style={[styles.cardDesc, { color: colors.mutedForeground }]}
            >
              Import images from email with source verification
            </Text>
          </View>
          <Feather
            name="lock"
            size={20}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.importCard,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: 0.6,
            },
          ]}
          onPress={() => handleSmsImport()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconBg,
              { backgroundColor: colors.mutedForeground + "20" },
            ]}
          >
            <Feather name="message-square" size={24} color={colors.mutedForeground} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              SMS/MMS Attachments
            </Text>
            <Text
              style={[styles.cardDesc, { color: colors.mutedForeground }]}
            >
              Import images from messaging apps with metadata
            </Text>
          </View>
          <Feather
            name="lock"
            size={20}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.importCard,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
              opacity: 0.6,
            },
          ]}
          onPress={() => handleCloudImport()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconBg,
              { backgroundColor: colors.mutedForeground + "20" },
            ]}
          >
            <Feather name="cloud" size={24} color={colors.mutedForeground} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>
              Cloud Storage
            </Text>
            <Text
              style={[styles.cardDesc, { color: colors.mutedForeground }]}
            >
              Import from Google Drive, Dropbox, OneDrive, and more
            </Text>
          </View>
          <Feather
            name="lock"
            size={20}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.infoBox,
            { backgroundColor: colors.accent, borderColor: colors.primary + "40" },
          ]}
        >
          <Feather name="info" size={16} color={colors.primary} />
          <Text
            style={[styles.infoText, { color: colors.accentForeground }]}
          >
            All images are analyzed locally on your device with full EXIF extraction and source verification. No data leaves your device unless explicitly sent for AI analysis.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: 12 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  importCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBg: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 24,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
