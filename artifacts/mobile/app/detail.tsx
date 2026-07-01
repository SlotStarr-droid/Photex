import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { InferencePill } from "@/components/InferencePill";
import { MetadataRow } from "@/components/MetadataRow";
import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";
import { analyzeImage, formatFileSize } from "@/utils/analyze";

const { width } = Dimensions.get("window");

type Section = "overview" | "metadata" | "ai" | "inferences";

export default function DetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { images, updateImage, removeImage } = useImages();
  const [section, setSection] = useState<Section>("overview");
  const [reanalyzing, setReanalyzing] = useState(false);

  const image = useMemo(() => images.find((i) => i.id === id), [images, id]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (!image && id) {
      router.back();
    }
  }, [image, id, router]);

  if (!image) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert("Delete Image", "Remove this image and all its analysis data?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await removeImage(image.id);
          router.back();
        },
      },
    ]);
  };

  const handleReanalyze = async () => {
    setReanalyzing(true);
    await updateImage(image.id, { status: "analyzing", error: undefined });
    try {
      const analysis = await analyzeImage(image.uri, image.metadata.mimeType ?? "image/jpeg");
      await updateImage(image.id, { status: "complete", analysis });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      await updateImage(image.id, {
        status: "error",
        error: err instanceof Error ? err.message : "Analysis failed",
      });
    } finally {
      setReanalyzing(false);
    }
  };

  const a = image.analysis;
  const TABS: { key: Section; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "metadata", label: "Metadata" },
    { key: "ai", label: "AI Analysis" },
    { key: "inferences", label: "Inferences" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: colors.foreground }]} numberOfLines={1}>
          {image.metadata.fileName ?? "Image"}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
      >
        {/* Image */}
        <Image
          source={{ uri: image.uri }}
          style={[styles.heroImage, { width }]}
          contentFit="contain"
          transition={200}
        />

        {/* Status banner */}
        {image.status === "analyzing" || reanalyzing ? (
          <View style={[styles.banner, { backgroundColor: colors.accent }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.bannerText, { color: colors.accentForeground }]}>
              Analyzing with AI…
            </Text>
          </View>
        ) : image.status === "error" ? (
          <View style={[styles.banner, { backgroundColor: colors.lowConfidenceBg }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.bannerText, { color: colors.destructive }]}>
              {image.error ?? "Analysis failed"}
            </Text>
            <TouchableOpacity onPress={() => void handleReanalyze()} style={styles.retryBtn}>
              <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBar, { borderBottomColor: colors.border }]}
          contentContainerStyle={styles.tabBarContent}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSection(tab.key)}
              style={[
                styles.tab,
                section === tab.key && [styles.tabActive, { borderBottomColor: colors.primary }],
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: section === tab.key ? colors.primary : colors.mutedForeground },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section content */}
        <View style={styles.content}>
          {section === "overview" && (
            <View style={styles.section}>
              {a ? (
                <>
                  <Text style={[styles.description, { color: colors.foreground }]}>
                    {a.description}
                  </Text>

                  {/* Tags */}
                  {a.tags.length > 0 && (
                    <View style={styles.tagRow}>
                      {a.tags.map((tag) => (
                        <View key={tag} style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                          <Text style={[styles.tagText, { color: colors.secondaryForeground }]}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Scene */}
                  <View style={[styles.sceneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sceneRow}>
                      <View>
                        <Text style={[styles.sceneLabel, { color: colors.mutedForeground }]}>Scene</Text>
                        <Text style={[styles.sceneValue, { color: colors.foreground }]}>
                          {a.scene.type}
                        </Text>
                      </View>
                      <ConfidenceBadge confidence={a.scene.confidence} />
                    </View>
                    <Text style={[styles.sceneDesc, { color: colors.mutedForeground }]}>
                      {a.scene.description}
                    </Text>
                  </View>

                  {/* Colors */}
                  {a.colors.length > 0 && (
                    <View style={styles.subsection}>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dominant Colors</Text>
                      <View style={styles.colorRow}>
                        {a.colors.slice(0, 5).map((c, i) => (
                          <View key={i} style={styles.colorItem}>
                            <View style={[styles.colorSwatch, { backgroundColor: c.hex }]} />
                            <Text style={[styles.colorName, { color: colors.mutedForeground }]}>
                              {c.name}
                            </Text>
                            <Text style={[styles.colorPct, { color: colors.foreground }]}>
                              {c.percentage}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Re-analyze */}
                  <TouchableOpacity
                    style={[styles.reanalyzeBtn, { borderColor: colors.border }]}
                    onPress={() => void handleReanalyze()}
                    disabled={reanalyzing}
                    activeOpacity={0.8}
                  >
                    <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
                    <Text style={[styles.reanalyzeBtnText, { color: colors.mutedForeground }]}>
                      Re-analyze
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.emptyMsg, { color: colors.mutedForeground }]}>
                  {image.status === "analyzing"
                    ? "Analysis in progress…"
                    : "No analysis available. Tap re-analyze to run."}
                </Text>
              )}
            </View>
          )}

          {section === "metadata" && (
            <View style={styles.section}>
              <View style={[styles.metaNotice, { backgroundColor: colors.accent, borderColor: colors.primary + "40" }]}>
                <Feather name="check-circle" size={15} color={colors.primary} />
                <Text style={[styles.metaNoticeText, { color: colors.accentForeground }]}>
                  VERIFIED: Extracted from file metadata and attributes
                </Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>File Information</Text>
              <View style={[styles.metaCard, { borderColor: colors.border }]}>
                {image.metadata.fileName && (
                  <MetadataRow label="File Name" value={image.metadata.fileName} />
                )}
                {image.metadata.mimeType && (
                  <MetadataRow label="Type" value={image.metadata.mimeType} />
                )}
                {image.metadata.width && image.metadata.height && (
                  <MetadataRow
                    label="Dimensions"
                    value={`${image.metadata.width} × ${image.metadata.height} px`}
                  />
                )}
                {image.metadata.fileSize && (
                  <MetadataRow
                    label="File Size"
                    value={formatFileSize(image.metadata.fileSize)}
                  />
                )}
                <MetadataRow
                  label="Source"
                  value={image.source === "camera" ? "Camera" : "Photo Library"}
                />
                <MetadataRow
                  label="Added"
                  value={new Date(image.addedAt).toLocaleString()}
                />
              </View>

              {image.metadata.exif && Object.keys(image.metadata.exif).length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
                    EXIF Data
                  </Text>
                  <View style={[styles.metaCard, { borderColor: colors.border }]}>
                    {Object.entries(image.metadata.exif)
                      .filter(([, v]) => v !== null && v !== undefined && typeof v !== "object")
                      .slice(0, 20)
                      .map(([k, v]) => (
                        <MetadataRow
                          key={k}
                          label={k.replace(/([A-Z])/g, " $1").trim()}
                          value={String(v)}
                        />
                      ))}
                  </View>
                </>
              )}
              {(image.metadata.md5Hash || image.metadata.sha256Hash) && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
                    Cryptographic Hashes
                  </Text>
                  <View style={[styles.metaCard, { borderColor: colors.border }]}>
                    {image.metadata.md5Hash && (
                      <MetadataRow
                        label="MD5"
                        value={image.metadata.md5Hash.substring(0, 16) + "..."}
                      />
                    )}
                    {image.metadata.sha256Hash && (
                      <MetadataRow
                        label="SHA-256"
                        value={image.metadata.sha256Hash.substring(0, 16) + "..."}
                      />
                    )}
                  </View>
                </>
              )}
            </View>
          )}

          {section === "ai" && (
            <View style={styles.section}>
              {a ? (
                <>
                  {/* Objects */}
                  {a.objects.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                        Detected Objects
                      </Text>
                      {a.objects.map((obj, i) => (
                        <View
                          key={i}
                          style={[styles.objRow, { borderBottomColor: colors.border }]}
                        >
                          <Text style={[styles.objName, { color: colors.foreground }]}>
                            {obj.name}
                          </Text>
                          <ConfidenceBadge confidence={obj.confidence} />
                        </View>
                      ))}
                    </>
                  )}

                  {/* Text */}
                  {a.text.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
                        Detected Text (OCR)
                      </Text>
                      {a.text.map((t, i) => (
                        <View
                          key={i}
                          style={[styles.textBlock, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                        >
                          <Text style={[styles.detectedText, { color: colors.foreground }]}>
                            {t.content}
                          </Text>
                          <ConfidenceBadge confidence={t.confidence} />
                        </View>
                      ))}
                    </>
                  )}

                  {/* Faces */}
                  {a.faces.count > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>
                        Faces
                      </Text>
                      <View style={[styles.faceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Feather name="users" size={20} color={colors.primary} />
                        <Text style={[styles.faceCount, { color: colors.foreground }]}>
                          {a.faces.count} face{a.faces.count !== 1 ? "s" : ""} detected
                        </Text>
                        <ConfidenceBadge confidence={a.faces.confidence} />
                      </View>
                    </>
                  )}

                  {a.model && (
                    <Text style={[styles.modelNote, { color: colors.mutedForeground }]}>
                      Analyzed by {a.model}
                      {a.analyzedAt ? ` · ${new Date(a.analyzedAt).toLocaleString()}` : ""}
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.emptyMsg, { color: colors.mutedForeground }]}>
                  No AI analysis available yet.
                </Text>
              )}
            </View>
          )}

          {section === "inferences" && (
            <View style={styles.section}>
              <View style={[styles.inferenceNotice, { backgroundColor: colors.inferredBg, borderColor: colors.inferred + "40" }]}>
                <Feather name="info" size={15} color={colors.inferred} />
                <Text style={[styles.inferenceNoticeText, { color: colors.inferred }]}>
                  These are AI estimates, not verified facts. Tap any card to see the reasoning.
                </Text>
              </View>
              {a?.inferences?.length ? (
                a.inferences.map((inf, i) => <InferencePill key={i} inference={inf} imageId={image.id} />)
              ) : (
                <Text style={[styles.emptyMsg, { color: colors.mutedForeground }]}>
                  No inferences available yet.
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  heroImage: { height: 260, backgroundColor: "#000" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  retryText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabBarContent: { paddingHorizontal: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: {},
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 16 },
  section: { gap: 12 },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  sceneCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  sceneRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sceneLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  sceneValue: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  sceneDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  subsection: { gap: 8 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  colorRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  colorItem: { alignItems: "center", gap: 4 },
  colorSwatch: { width: 36, height: 36, borderRadius: 8 },
  colorName: { fontSize: 10, fontFamily: "Inter_400Regular" },
  colorPct: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  reanalyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  reanalyzeBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emptyMsg: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 40 },
  metaCard: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, overflow: "hidden" },
  objRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  objName: { fontSize: 14, fontFamily: "Inter_400Regular" },
  textBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  detectedText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  faceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  faceCount: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  modelNote: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },
  inferenceNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  inferenceNoticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  metaNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  metaNoticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
});
