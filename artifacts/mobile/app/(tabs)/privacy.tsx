import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { auditLog, clearAll, images } = useImages();
  const [localOnly, setLocalOnly] = useState(true);
  const [showAudit, setShowAudit] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleClearAll = () => {
    Alert.alert(
      "Delete All Images",
      `This will permanently remove all ${images.length} images and their analysis data. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAll();
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
          { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Privacy</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Control how your data is handled
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Architecture notice */}
        <View style={[styles.notice, { backgroundColor: colors.accent, borderColor: colors.primary + "40" }]}>
          <Feather name="shield" size={18} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.accentForeground }]}>
            Images are processed locally. Only image data sent for AI analysis is transmitted to OpenAI's servers. No data is stored in the cloud.
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Settings</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Feather name="hard-drive" size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.foreground }]}>Local Storage Only</Text>
                <Text style={[styles.settingDesc, { color: colors.mutedForeground }]}>
                  Images stay on this device
                </Text>
              </View>
            </View>
            <Switch
              value={localOnly}
              onValueChange={setLocalOnly}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Data</Text>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.dataRow}>
            <Feather name="image" size={16} color={colors.mutedForeground} />
            <Text style={[styles.dataLabel, { color: colors.foreground }]}>Images stored</Text>
            <Text style={[styles.dataValue, { color: colors.primary }]}>{images.length}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.dataRow}>
            <Feather name="list" size={16} color={colors.mutedForeground} />
            <Text style={[styles.dataLabel, { color: colors.foreground }]}>Audit log entries</Text>
            <Text style={[styles.dataValue, { color: colors.primary }]}>{auditLog.length}</Text>
          </View>
        </View>

        {/* Audit log */}
        <TouchableOpacity
          style={[styles.auditToggle, { borderColor: colors.border }]}
          onPress={() => setShowAudit((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.auditToggleRow}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.auditToggleText, { color: colors.foreground }]}>Audit Log</Text>
          </View>
          <Feather
            name={showAudit ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        {showAudit && (
          <View style={[styles.auditList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {auditLog.length === 0 ? (
              <Text style={[styles.auditEmpty, { color: colors.mutedForeground }]}>
                No activity recorded yet
              </Text>
            ) : (
              auditLog.slice(0, 50).map((entry) => (
                <View key={entry.id} style={[styles.auditEntry, { borderBottomColor: colors.border }]}>
                  <View style={styles.auditEntryHeader}>
                    <Text style={[styles.auditAction, { color: colors.primary }]}>
                      {entry.action}
                    </Text>
                    <Text style={[styles.auditTime, { color: colors.mutedForeground }]}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={[styles.auditDetail, { color: colors.mutedForeground }]}>
                    {entry.details}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.clearBtn, { borderColor: colors.destructive + "60" }]}
          onPress={handleClearAll}
          activeOpacity={0.8}
          disabled={images.length === 0}
        >
          <Feather name="trash-2" size={16} color={images.length === 0 ? colors.border : colors.destructive} />
          <Text
            style={[
              styles.clearBtnText,
              { color: images.length === 0 ? colors.border : colors.destructive },
            ]}
          >
            Delete All Images
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  scroll: { padding: 16, gap: 8 },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  noticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  settingTitle: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dataLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  dataValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  auditToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 4,
  },
  auditToggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  auditToggleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  auditList: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  auditEmpty: {
    padding: 20,
    textAlign: "center",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  auditEntry: {
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  auditEntryHeader: { flexDirection: "row", justifyContent: "space-between" },
  auditAction: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  auditTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  auditDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
  },
  clearBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
