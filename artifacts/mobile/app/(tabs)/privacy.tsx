import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as MediaLibrary from "expo-media-library";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Linking,
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

interface PermissionRow {
  key: string;
  label: string;
  description: string;
  icon: string;
  status: "granted" | "denied" | "undetermined" | "loading";
}

function statusColor(status: PermissionRow["status"], primary: string): string {
  if (status === "granted") return "#10B981";
  if (status === "denied") return "#EF4444";
  return primary;
}

function statusLabel(status: PermissionRow["status"]): string {
  if (status === "granted") return "Granted";
  if (status === "denied") return "Denied";
  if (status === "loading") return "Checking…";
  return "Not requested";
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { auditLog, clearAll, images } = useImages();
  const [showAudit, setShowAudit] = useState(false);

  const [permissions, setPermissions] = useState<PermissionRow[]>([
    {
      key: "camera",
      label: "Camera",
      description: "Capture photos directly in-app",
      icon: "camera",
      status: "loading",
    },
    {
      key: "mediaLibrary",
      label: "Photo Library",
      description: "Import existing photos from gallery",
      icon: "image",
      status: "loading",
    },
    {
      key: "mediaLibrarySave",
      label: "Save to Gallery",
      description: "Export processed images back to gallery",
      icon: "download",
      status: "loading",
    },
    {
      key: "location",
      label: "Location",
      description: "Geotag camera photos (optional)",
      icon: "map-pin",
      status: "loading",
    },
  ]);

  const checkPermissions = useCallback(async () => {
    const [cam, media, mediaSave, loc] = await Promise.all([
      ImagePicker.getCameraPermissionsAsync(),
      ImagePicker.getMediaLibraryPermissionsAsync(),
      MediaLibrary.getPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
    ]);

    setPermissions([
      {
        key: "camera",
        label: "Camera",
        description: "Capture photos directly in-app",
        icon: "camera",
        status: cam.status as PermissionRow["status"],
      },
      {
        key: "mediaLibrary",
        label: "Photo Library",
        description: "Import existing photos from gallery",
        icon: "image",
        status: media.status as PermissionRow["status"],
      },
      {
        key: "mediaSave",
        label: "Save to Gallery",
        description: "Export processed images back to gallery",
        icon: "download",
        status: mediaSave.status as PermissionRow["status"],
      },
      {
        key: "location",
        label: "Location",
        description: "Geotag camera photos (optional)",
        icon: "map-pin",
        status: loc.status as PermissionRow["status"],
      },
    ]);
  }, []);

  useEffect(() => {
    void checkPermissions();
  }, [checkPermissions]);

  const requestPermission = async (key: string) => {
    let granted = false;
    if (key === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      granted = status === "granted";
    } else if (key === "mediaLibrary") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      granted = status === "granted";
    } else if (key === "mediaSave") {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      granted = status === "granted";
    } else if (key === "location") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      granted = status === "granted";
    }

    await Haptics.impactAsync(
      granted ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy,
    );
    void checkPermissions();
  };

  const openSettings = () => {
    void Linking.openSettings();
  };

  const handleClearAll = () => {
    Alert.alert(
      "Delete All Data",
      `This will permanently remove all ${images.length} images, analyses, investigations, and audit log entries. This cannot be undone.`,
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
      ],
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Permissions, privacy & data management
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy notice */}
        <View
          style={[
            styles.notice,
            { backgroundColor: colors.accent, borderColor: colors.primary + "40" },
          ]}
        >
          <Feather name="shield" size={18} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.accentForeground }]}>
            All images and analyses are stored locally on this device using
            AsyncStorage. Only image data sent explicitly for AI analysis leaves
            the device — no background uploads, no tracking.
          </Text>
        </View>

        {/* Permissions */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          App Permissions
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {permissions.map((perm, idx) => {
            const color = statusColor(perm.status, colors.primary);
            const canRequest =
              perm.status === "undetermined" || perm.status === "loading";
            const isDenied = perm.status === "denied";

            return (
              <View key={perm.key}>
                {idx > 0 && (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
                <View style={styles.permRow}>
                  <View
                    style={[
                      styles.permIcon,
                      { backgroundColor: color + "20" },
                    ]}
                  >
                    <Feather
                      name={
                        perm.icon as React.ComponentProps<typeof Feather>["name"]
                      }
                      size={16}
                      color={color}
                    />
                  </View>
                  <View style={styles.permInfo}>
                    <Text
                      style={[styles.permLabel, { color: colors.foreground }]}
                    >
                      {perm.label}
                    </Text>
                    <Text
                      style={[
                        styles.permDesc,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {perm.description}
                    </Text>
                  </View>
                  <View style={styles.permRight}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: color + "20" },
                      ]}
                    >
                      <Text style={[styles.statusText, { color }]}>
                        {statusLabel(perm.status)}
                      </Text>
                    </View>
                    {canRequest && (
                      <TouchableOpacity
                        onPress={() => void requestPermission(perm.key)}
                        style={[
                          styles.requestBtn,
                          { backgroundColor: colors.primary },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.requestBtnText}>Request</Text>
                      </TouchableOpacity>
                    )}
                    {isDenied && (
                      <TouchableOpacity
                        onPress={openSettings}
                        style={[
                          styles.requestBtn,
                          {
                            backgroundColor: "transparent",
                            borderWidth: 1,
                            borderColor: colors.border,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.requestBtnText,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          Open Settings
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => void checkPermissions()}
          style={[
            styles.refreshBtn,
            { borderColor: colors.border },
          ]}
          activeOpacity={0.7}
        >
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          <Text style={[styles.refreshText, { color: colors.mutedForeground }]}>
            Refresh permission status
          </Text>
        </TouchableOpacity>

        {/* Android native info */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Native Integration
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {[
            {
              icon: "cpu",
              label: "New Architecture",
              value: "Enabled (Fabric + TurboModules)",
            },
            {
              icon: "camera",
              label: "Camera Engine",
              value: "expo-image-picker (native)",
            },
            {
              icon: "map-pin",
              label: "Location Engine",
              value: "expo-location (foreground only)",
            },
            {
              icon: "hard-drive",
              label: "Storage Engine",
              value: "AsyncStorage (local, encrypted on Android)",
            },
            {
              icon: "zap",
              label: "AI Engine",
              value: "GPT-4o / GPT-4o-mini via secure API",
            },
          ].map((row, i) => (
            <View key={row.label}>
              {i > 0 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
              <View style={styles.infoRow}>
                <Feather
                  name={
                    row.icon as React.ComponentProps<typeof Feather>["name"]
                  }
                  size={14}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.infoLabel, { color: colors.foreground }]}>
                  {row.label}
                </Text>
                <Text
                  style={[styles.infoValue, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Data */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          On-Device Data
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {[
            { icon: "image", label: "Images stored", value: images.length },
            { icon: "list", label: "Audit log entries", value: auditLog.length },
          ].map((row, i) => (
            <View key={row.label}>
              {i > 0 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />
              )}
              <View style={styles.dataRow}>
                <Feather
                  name={
                    row.icon as React.ComponentProps<typeof Feather>["name"]
                  }
                  size={16}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.dataLabel, { color: colors.foreground }]}>
                  {row.label}
                </Text>
                <Text style={[styles.dataValue, { color: colors.primary }]}>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Audit log */}
        <TouchableOpacity
          style={[styles.auditToggle, { borderColor: colors.border }]}
          onPress={() => setShowAudit((v) => !v)}
          activeOpacity={0.7}
        >
          <View style={styles.auditToggleRow}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.auditToggleText, { color: colors.foreground }]}>
              Activity Log
            </Text>
          </View>
          <Feather
            name={showAudit ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>

        {showAudit && (
          <View
            style={[
              styles.auditList,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {auditLog.length === 0 ? (
              <Text
                style={[styles.auditEmpty, { color: colors.mutedForeground }]}
              >
                No activity recorded yet
              </Text>
            ) : (
              auditLog.slice(0, 50).map((entry) => (
                <View
                  key={entry.id}
                  style={[
                    styles.auditEntry,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.auditEntryHeader}>
                    <Text
                      style={[styles.auditAction, { color: colors.primary }]}
                    >
                      {entry.action}
                    </Text>
                    <Text
                      style={[
                        styles.auditTime,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.auditDetail,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {entry.details}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* Danger zone */}
        <TouchableOpacity
          style={[
            styles.clearBtn,
            {
              borderColor:
                images.length === 0
                  ? colors.border
                  : colors.destructive + "60",
            },
          ]}
          onPress={handleClearAll}
          activeOpacity={0.8}
          disabled={images.length === 0}
        >
          <Feather
            name="trash-2"
            size={16}
            color={
              images.length === 0 ? colors.border : colors.destructive
            }
          />
          <Text
            style={[
              styles.clearBtnText,
              {
                color:
                  images.length === 0
                    ? colors.border
                    : colors.destructive,
              },
            ]}
          >
            Delete All Data
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
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 4,
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  permIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  permInfo: { flex: 1 },
  permLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  permDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  permRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  requestBtn: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  requestBtnText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  refreshText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  infoLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 12, fontFamily: "Inter_400Regular", maxWidth: 170 },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dataLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  dataValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  auditToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  auditToggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  auditToggleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  auditList: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 8,
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
    marginTop: 12,
  },
  clearBtnText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
