import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";
import type { Investigation } from "@/types/image";

function NewInvestigationModal({
  visible,
  onClose,
  onCreate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (title: string, desc: string) => void;
}) {
  const colors = useColors();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreate(title.trim(), desc.trim());
    setTitle("");
    setDesc("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            New Investigation
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="Investigation name…"
            placeholderTextColor={colors.mutedForeground}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />
          <TextInput
            style={[
              styles.modalInput,
              styles.modalTextarea,
              { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
            ]}
            placeholder="Description (optional)…"
            placeholderTextColor={colors.mutedForeground}
            value={desc}
            onChangeText={setDesc}
            multiline
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalCreateBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              disabled={!title.trim()}
            >
              <Text style={[styles.modalCreateText, { color: colors.primaryForeground }]}>
                Create
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InvestigationCard({
  investigation,
  onPress,
  onDelete,
}: {
  investigation: Investigation;
  onPress: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const { images } = useImages();
  const invImages = images.filter((i) => investigation.imageIds.includes(i.id)).slice(0, 4);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.85}
    >
      {/* Image strip */}
      <View style={styles.imageStrip}>
        {invImages.length > 0 ? (
          invImages.map((img, i) => (
            <Image
              key={img.id}
              source={{ uri: img.uri }}
              style={[
                styles.stripImage,
                { zIndex: invImages.length - i, marginLeft: i > 0 ? -14 : 0 },
              ]}
              contentFit="cover"
            />
          ))
        ) : (
          <View style={[styles.emptyStrip, { backgroundColor: colors.secondary }]}>
            <Feather name="folder" size={24} color={colors.mutedForeground} />
          </View>
        )}
        {investigation.imageIds.length > 4 && (
          <View style={[styles.moreCount, { backgroundColor: colors.primary }]}>
            <Text style={styles.moreCountText}>+{investigation.imageIds.length - 4}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
          {investigation.title}
        </Text>
        {investigation.description ? (
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
            {investigation.description}
          </Text>
        ) : null}
        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
            {investigation.imageIds.length} image{investigation.imageIds.length !== 1 ? "s" : ""}
          </Text>
          <Text style={[styles.cardMetaText, { color: colors.mutedForeground }]}>
            {new Date(investigation.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function InvestigateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { investigations, createInvestigation, deleteInvestigation } = useImages();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleCreate = async (title: string, desc: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const inv = await createInvestigation(title, desc);
    router.push({ pathname: "/investigation/[id]", params: { id: inv.id } });
  };

  const handleDelete = (inv: Investigation) => {
    Alert.alert(
      "Delete Investigation",
      `Delete "${inv.title}"? This will not delete the images.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteInvestigation(inv.id);
          },
        },
      ]
    );
  };

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
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>Investigations</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {investigations.length} workspace{investigations.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowNew(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {investigations.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="folder-plus" size={52} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No investigations yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create a workspace to group related images, write notes, and build a case
            </Text>
            <TouchableOpacity
              style={[styles.goBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowNew(true)}
            >
              <Text style={[styles.goBtnText, { color: colors.primaryForeground }]}>
                New Investigation
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Long-press to delete
            </Text>
            {investigations.map((inv) => (
              <InvestigationCard
                key={inv.id}
                investigation={inv}
                onPress={() =>
                  router.push({ pathname: "/investigation/[id]", params: { id: inv.id } })
                }
                onDelete={() => handleDelete(inv)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <NewInvestigationModal
        visible={showNew}
        onClose={() => setShowNew(false)}
        onCreate={(t, d) => void handleCreate(t, d)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { padding: 16, gap: 12 },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  goBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  imageStrip: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
  },
  stripImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#1a1a1a",
  },
  emptyStrip: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  moreCount: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -10,
  },
  moreCountText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  cardContent: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  cardMeta: { flexDirection: "row", gap: 10, marginTop: 2 },
  cardMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  modalTextarea: { minHeight: 80, textAlignVertical: "top" },
  modalButtons: { flexDirection: "row", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  modalCreateBtn: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  modalCreateText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
