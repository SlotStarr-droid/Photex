import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  imageId: string;
  attribute: string;
  originalValue: string;
  visible: boolean;
  onClose: () => void;
}

export function CorrectionModal({
  imageId,
  attribute,
  originalValue,
  visible,
  onClose,
}: Props) {
  const colors = useColors();
  const { addCorrection } = useImages();
  const [corrected, setCorrected] = useState("");

  const handleSubmit = async () => {
    if (!corrected.trim()) return;
    await addCorrection({
      imageId,
      attribute,
      originalValue,
      correctedValue: corrected.trim(),
      appliedToFuture: true,
    });
    setCorrected("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            Correct AI Inference
          </Text>
          <Text style={[styles.attr, { color: colors.mutedForeground }]}>
            {attribute}
          </Text>

          <View style={[styles.originalRow, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.originalLabel, { color: colors.mutedForeground }]}>
              AI inferred:
            </Text>
            <Text style={[styles.originalValue, { color: colors.inferred }]}>
              {originalValue}
            </Text>
          </View>

          <Text style={[styles.inputLabel, { color: colors.foreground }]}>
            Your correction:
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                color: colors.foreground,
              },
            ]}
            value={corrected}
            onChangeText={setCorrected}
            placeholder="Enter the correct value…"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
          />

          <View style={[styles.notice, { backgroundColor: colors.accent }]}>
            <Feather name="info" size={13} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.accentForeground }]}>
              Your correction will be used to improve future analyses of similar images on this device.
            </Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={() => void handleSubmit()}
              disabled={!corrected.trim()}
            >
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>
                Save Correction
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  attr: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  originalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  originalLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  originalValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  inputLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  buttons: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  submitBtn: {
    flex: 2,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  submitText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
