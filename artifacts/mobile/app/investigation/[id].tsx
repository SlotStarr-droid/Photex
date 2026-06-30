import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";
import type { StoredImage } from "@/types/image";

const { width } = Dimensions.get("window");
const THUMB = (width - 16 * 2 - 8 * 2) / 3;

type Tab = "images" | "notes" | "summary";

export default function InvestigationDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    images,
    investigations,
    updateInvestigation,
    addImageToInvestigation,
    removeImageFromInvestigation,
  } = useImages();

  const investigation = useMemo(
    () => investigations.find((i) => i.id === id),
    [investigations, id]
  );

  const [tab, setTab] = useState<Tab>("images");
  const [notes, setNotes] = useState(investigation?.notes ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(investigation?.title ?? "");
  const [showAddImages, setShowAddImages] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const invImages = useMemo(
    () => images.filter((i) => investigation?.imageIds.includes(i.id)),
    [images, investigation]
  );

  const availableImages = useMemo(
    () => images.filter((i) => !investigation?.imageIds.includes(i.id) && i.status === "complete"),
    [images, investigation]
  );

  if (!investigation) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backRow, { paddingTop: topPad + 12 }]}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Investigation not found</Text>
      </View>
    );
  }

  const saveNotes = async () => {
    await updateInvestigation(id, { notes });
  };

  const saveTitle = async () => {
    if (titleDraft.trim()) {
      await updateInvestigation(id, { title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const handleRemoveImage = (imgId: string) => {
    Alert.alert("Remove Image", "Remove this image from the investigation?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void removeImageFromInvestigation(id, imgId),
      },
    ]);
  };

  const generateSummary = () => {
    if (invImages.length === 0) return "No images in this investigation yet.";
    const tags = new Set<string>();
    const scenes = new Set<string>();
    const objects = new Set<string>();
    for (const img of invImages) {
      img.analysis?.tags.forEach((t) => tags.add(t));
      if (img.analysis?.scene.type) scenes.add(img.analysis.scene.type);
      img.analysis?.objects.slice(0, 3).forEach((o) => objects.add(o.name));
    }
    const lines = [
      `This investigation contains ${invImages.length} image${invImages.length !== 1 ? "s" : ""}.`,
    ];
    if (scenes.size > 0)
      lines.push(`Scene types detected: ${[...scenes].join(", ")}.`);
    if (objects.size > 0)
      lines.push(`Key objects identified: ${[...objects].slice(0, 8).join(", ")}.`);
    if (tags.size > 0)
      lines.push(`Content themes: ${[...tags].slice(0, 8).join(", ")}.`);
    if (notes.trim())
      lines.push(`\nInvestigator notes:\n${notes.trim()}`);
    return lines.join("\n");
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.titleArea}>
            {editingTitle ? (
              <TextInput
                style={[styles.titleInput, { color: colors.foreground, borderColor: colors.border }]}
                value={titleDraft}
                onChangeText={setTitleDraft}
                onBlur={() => void saveTitle()}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => void saveTitle()}
              />
            ) : (
              <TouchableOpacity onPress={() => setEditingTitle(true)}>
                <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
                  {investigation.title}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {invImages.length} image{invImages.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addImageBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddImages(true)}
          >
            <Feather name="plus" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["images", "notes", "summary"] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[
                styles.tabBtn,
                tab === t && [styles.tabBtnActive, { borderBottomColor: colors.primary }],
              ]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: tab === t ? colors.primary : colors.mutedForeground },
                ]}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {tab === "images" && (
        <ScrollView
          contentContainerStyle={[styles.imageGrid, { paddingBottom: bottomPad + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          {invImages.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="image" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Tap + to add images to this investigation
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {invImages.map((img) => (
                <TouchableOpacity
                  key={img.id}
                  style={[styles.thumbWrap, { width: THUMB, height: THUMB }]}
                  onPress={() => router.push({ pathname: "/detail", params: { id: img.id } })}
                  onLongPress={() => handleRemoveImage(img.id)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: img.uri }}
                    style={styles.thumb}
                    contentFit="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {invImages.length > 0 && (
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Long-press to remove
            </Text>
          )}
        </ScrollView>
      )}

      {tab === "notes" && (
        <View style={styles.notesContainer}>
          <TextInput
            style={[
              styles.notesInput,
              {
                color: colors.foreground,
                backgroundColor: colors.background,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            onBlur={() => void saveNotes()}
            multiline
            placeholder="Write your investigation notes here…"
            placeholderTextColor={colors.mutedForeground}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
            onPress={() => void saveNotes()}
          >
            <Feather name="save" size={16} color="#fff" />
            <Text style={styles.saveBtnText}>Save Notes</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === "summary" && (
        <ScrollView
          contentContainerStyle={[styles.summaryScroll, { paddingBottom: bottomPad + 90 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.summaryHeader}>
              <Feather name="file-text" size={16} color={colors.primary} />
              <Text style={[styles.summaryTitle, { color: colors.foreground }]}>
                AI-Generated Summary
              </Text>
            </View>
            <Text style={[styles.summaryText, { color: colors.foreground }]}>
              {generateSummary()}
            </Text>
          </View>

          {invImages.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Images in Investigation</Text>
              {invImages.map((img) => (
                <TouchableOpacity
                  key={img.id}
                  style={[styles.summaryImageRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push({ pathname: "/detail", params: { id: img.id } })}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: img.uri }} style={styles.summaryThumb} contentFit="cover" />
                  <View style={styles.summaryImageInfo}>
                    <Text style={[styles.summaryImageName, { color: colors.foreground }]} numberOfLines={1}>
                      {img.metadata.fileName ?? "Image"}
                    </Text>
                    {img.analysis?.scene.type && (
                      <Text style={[styles.summaryImageScene, { color: colors.mutedForeground }]}>
                        {img.analysis.scene.type}
                      </Text>
                    )}
                    {img.analysis?.tags && (
                      <Text style={[styles.summaryImageTags, { color: colors.primary }]} numberOfLines={1}>
                        {img.analysis.tags.slice(0, 4).join(" · ")}
                      </Text>
                    )}
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Add images modal */}
      <Modal visible={showAddImages} transparent animationType="slide">
        <View style={[styles.modalOverlay]}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Images</Text>
              <TouchableOpacity onPress={() => setShowAddImages(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {availableImages.length === 0 ? (
              <Text style={[styles.noImages, { color: colors.mutedForeground }]}>
                All analyzed images are already in this investigation
              </Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.addGrid}>
                  {availableImages.map((img) => (
                    <TouchableOpacity
                      key={img.id}
                      style={styles.addThumbWrap}
                      onPress={async () => {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        await addImageToInvestigation(id, img.id);
                        setShowAddImages(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: img.uri }} style={styles.addThumb} contentFit="cover" />
                      <View style={[styles.addOverlay, { backgroundColor: colors.primary + "20" }]}>
                        <Feather name="plus-circle" size={22} color={colors.primary} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backRow: { paddingHorizontal: 16, paddingBottom: 8 },
  notFound: { textAlign: "center", fontSize: 16, marginTop: 40, fontFamily: "Inter_400Regular" },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 10,
  },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  titleArea: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  titleInput: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  addImageBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: { flexDirection: "row" },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {},
  tabLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  imageGrid: { padding: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { borderRadius: 10, overflow: "hidden", backgroundColor: "#1a1a1a" },
  thumb: { width: "100%", height: "100%" },
  hintText: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 12 },
  empty: { alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 240 },
  notesContainer: { flex: 1, padding: 16, gap: 12 },
  notesInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    padding: 0,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  summaryScroll: { padding: 16, gap: 14 },
  summaryBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  summaryText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  summaryImageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryThumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: "#1a1a1a" },
  summaryImageInfo: { flex: 1, gap: 3 },
  summaryImageName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  summaryImageScene: { fontSize: 12, fontFamily: "Inter_400Regular" },
  summaryImageTags: { fontSize: 11, fontFamily: "Inter_400Regular" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: 40,
    maxHeight: "70%",
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  noImages: { textAlign: "center", fontSize: 14, fontFamily: "Inter_400Regular", padding: 24 },
  addGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  addThumbWrap: {
    width: (width - 32 - 16) / 3,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  addThumb: { width: "100%", height: "100%" },
  addOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
