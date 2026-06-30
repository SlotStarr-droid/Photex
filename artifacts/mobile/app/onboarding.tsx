import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

export const ONBOARDING_KEY = "onboarding_v1_complete";

const { width } = Dimensions.get("window");

interface Step {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  permissionLabel?: string;
  permissionNote?: string;
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    icon: "eye",
    iconColor: "#3B82F6",
    iconBg: "#3B82F620",
    title: "Image Intelligence",
    body: "Analyze photos with AI, build knowledge graphs, and investigate visual patterns — all stored privately on your device.",
    permissionLabel: undefined,
  },
  {
    icon: "camera",
    iconColor: "#10B981",
    iconBg: "#10B98120",
    title: "Camera Access",
    body: "Take photos directly in-app for instant AI analysis. Images are stored locally and only sent to AI for the analysis you request.",
    permissionLabel: "Allow Camera",
    permissionNote: "Required to capture photos",
  },
  {
    icon: "image",
    iconColor: "#F59E0B",
    iconBg: "#F59E0B20",
    title: "Photo Library",
    body: "Import existing photos from your gallery. Metadata including EXIF and GPS (if present) will be extracted automatically.",
    permissionLabel: "Allow Photo Library",
    permissionNote: "Required to import existing photos",
  },
  {
    icon: "map-pin",
    iconColor: "#8B5CF6",
    iconBg: "#8B5CF620",
    title: "Location (Optional)",
    body: "Used only to enrich images you capture — never tracked in the background. Skip this if you prefer full manual control.",
    permissionLabel: "Allow Location",
    permissionNote: "Optional — helps geotag camera photos",
    optional: true,
  },
  {
    icon: "check-circle",
    iconColor: "#10B981",
    iconBg: "#10B98120",
    title: "You're all set",
    body: "Start by adding your first image from the library. The AI will analyze it and build an intelligence profile automatically.",
  },
];

async function requestStepPermission(stepIndex: number): Promise<boolean> {
  if (stepIndex === 1) {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === "granted";
  }
  if (stepIndex === 2) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
  }
  if (stepIndex === 3) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  }
  return true;
}

async function checkStepPermission(stepIndex: number): Promise<boolean> {
  if (stepIndex === 1) {
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    return status === "granted";
  }
  if (stepIndex === 2) {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    return status === "granted";
  }
  if (stepIndex === 3) {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === "granted";
  }
  return true;
}

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [granted, setGranted] = useState<Record<number, boolean>>({});
  const [requesting, setRequesting] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const currentStep = STEPS[step]!;
  const isLast = step === STEPS.length - 1;
  const hasPermission = currentStep.permissionLabel == null || granted[step];

  // Check existing permissions on mount
  useEffect(() => {
    const check = async () => {
      const results: Record<number, boolean> = {};
      for (let i = 1; i <= 3; i++) {
        results[i] = await checkStepPermission(i);
      }
      setGranted(results);
    };
    void check();
  }, []);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progress, {
      toValue: step / (STEPS.length - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progress]);

  const animateToNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      slideAnim.setValue(width);
      setStep((s) => s + 1);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleGrant = async () => {
    setRequesting(true);
    try {
      const ok = await requestStepPermission(step);
      await Haptics.impactAsync(
        ok ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy,
      );
      setGranted((prev) => ({ ...prev, [step]: ok }));
    } finally {
      setRequesting(false);
    }
  };

  const handleNext = async () => {
    if (isLast) {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateToNext();
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    router.replace("/(tabs)");
  };

  const canProceed = hasPermission || currentStep.optional === true;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View
        style={[
          styles.progressTrack,
          { marginTop: insets.top + 16, backgroundColor: colors.border },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* Step indicator */}
      <Text style={[styles.stepIndicator, { color: colors.mutedForeground }]}>
        {step + 1} of {STEPS.length}
      </Text>

      {/* Content */}
      <Animated.View
        style={[styles.content, { transform: [{ translateX: slideAnim }] }]}
      >
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: currentStep.iconBg },
          ]}
        >
          <Feather
            name={currentStep.icon as React.ComponentProps<typeof Feather>["name"]}
            size={40}
            color={currentStep.iconColor}
          />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          {currentStep.title}
        </Text>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>
          {currentStep.body}
        </Text>

        {/* Permission status */}
        {currentStep.permissionLabel && (
          <View style={styles.permissionSection}>
            {granted[step] ? (
              <View
                style={[
                  styles.grantedBadge,
                  { backgroundColor: "#10B98118", borderColor: "#10B98140" },
                ]}
              >
                <Feather name="check-circle" size={16} color="#10B981" />
                <Text style={[styles.grantedText, { color: "#10B981" }]}>
                  Permission granted
                </Text>
              </View>
            ) : (
              <Pressable
                onPress={() => void handleGrant()}
                disabled={requesting}
                style={({ pressed }) => [
                  styles.grantBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Feather name="shield" size={16} color="#fff" />
                <Text style={styles.grantBtnText}>
                  {requesting ? "Requesting…" : currentStep.permissionLabel}
                </Text>
              </Pressable>
            )}
            {currentStep.permissionNote && (
              <Text style={[styles.permNote, { color: colors.mutedForeground }]}>
                {currentStep.permissionNote}
              </Text>
            )}
          </View>
        )}
      </Animated.View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === step ? colors.primary : colors.border,
                  width: i === step ? 20 : 6,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.footerActions}>
          {!isLast && (
            <Pressable
              onPress={() => void handleSkip()}
              style={({ pressed }) => [
                styles.skipBtn,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                Skip setup
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => void handleNext()}
            disabled={!canProceed && !isLast}
            style={({ pressed }) => [
              styles.nextBtn,
              {
                backgroundColor: canProceed
                  ? colors.primary
                  : colors.mutedForeground + "40",
                opacity: pressed ? 0.85 : 1,
                flex: isLast ? 1 : undefined,
              },
            ]}
          >
            <Text
              style={[
                styles.nextBtnText,
                {
                  color: canProceed ? "#fff" : colors.mutedForeground,
                },
              ]}
            >
              {isLast
                ? "Open App"
                : currentStep.optional && !granted[step]
                ? "Skip"
                : "Continue"}
            </Text>
            {!isLast && (
              <Feather
                name="arrow-right"
                size={16}
                color={canProceed ? "#fff" : colors.mutedForeground}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginHorizontal: 24,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  stepIndicator: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 12,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  permissionSection: {
    width: "100%",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  grantBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
  },
  grantBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  grantedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
  },
  grantedText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  permNote: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
