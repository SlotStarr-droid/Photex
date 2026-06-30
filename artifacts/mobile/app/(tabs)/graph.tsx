import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EdgeDetailSheet } from "@/components/EdgeDetailSheet";
import { GraphCanvas } from "@/components/GraphCanvas";
import { useImages } from "@/context/ImageContext";
import { useColors } from "@/hooks/useColors";
import type { GraphEdge, GraphNode } from "@/types/image";
import {
  buildInitialNodes,
  extractEdges,
  EDGE_COLORS,
  runForceSimulation,
} from "@/utils/graph";

const { width: SW, height: SH } = Dimensions.get("window");
const CANVAS_W = SW * 2.5;
const CANVAS_H = SH * 2.5;

export default function GraphScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { images } = useImages();
  const router = useRouter();

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [computing, setComputing] = useState(false);
  const [filter, setFilter] = useState<"all" | "verified" | "inferred">("all");

  const analyzed = useMemo(
    () => images.filter((i) => i.status === "complete" && i.analysis),
    [images]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    if (analyzed.length < 2) {
      setNodes([]);
      setEdges([]);
      return;
    }

    setComputing(true);
    // Run in a timeout to avoid blocking the UI
    const t = setTimeout(() => {
      const rawEdges = extractEdges(analyzed);
      const initialNodes = buildInitialNodes(analyzed, CANVAS_W, CANVAS_H);
      const simulatedNodes = runForceSimulation(
        initialNodes,
        rawEdges,
        CANVAS_W,
        CANVAS_H,
        150
      );
      setEdges(rawEdges);
      setNodes(simulatedNodes);
      setComputing(false);
    }, 50);
    return () => clearTimeout(t);
  }, [analyzed]);

  const filteredEdges = useMemo(() => {
    if (filter === "all") return edges;
    return edges.filter((e) => e.evidenceType === filter);
  }, [edges, filter]);

  const stats = useMemo(() => {
    const verified = edges.filter((e) => e.evidenceType === "verified").length;
    const inferred = edges.filter((e) => e.evidenceType === "inferred").length;
    return { verified, inferred, total: edges.length, nodes: nodes.length };
  }, [edges, nodes]);

  const handleSelectNode = (imageId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/detail", params: { id: imageId } });
  };

  const handleSelectEdge = (edge: GraphEdge | null) => {
    if (edge) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEdge(edge);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
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
            <Text style={[styles.title, { color: colors.foreground }]}>Knowledge Graph</Text>
            {analyzed.length >= 2 && !computing && (
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {stats.nodes} images · {stats.total} connection{stats.total !== 1 ? "s" : ""}
              </Text>
            )}
          </View>
          {analyzed.length >= 2 && (
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: EDGE_COLORS.verified }]} />
                <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Verified</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDash, { borderColor: EDGE_COLORS.inferred }]} />
                <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>Inferred</Text>
              </View>
            </View>
          )}
        </View>

        {analyzed.length >= 2 && (
          <View style={styles.filterRow}>
            {(["all", "verified", "inferred"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterBtn,
                  {
                    backgroundColor:
                      filter === f ? colors.primary : colors.secondary,
                    borderColor: filter === f ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    {
                      color:
                        filter === f ? colors.primaryForeground : colors.mutedForeground,
                    },
                  ]}
                >
                  {f === "all"
                    ? `All (${stats.total})`
                    : f === "verified"
                    ? `Verified (${stats.verified})`
                    : `Inferred (${stats.inferred})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Graph area */}
      {analyzed.length < 2 ? (
        <View style={styles.empty}>
          <Feather name="share-2" size={52} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            Not enough images
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Add at least 2 analyzed images to see the knowledge graph
          </Text>
          <TouchableOpacity
            style={[styles.goBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/import")}
          >
            <Text style={[styles.goBtnText, { color: colors.primaryForeground }]}>
              Add Images
            </Text>
          </TouchableOpacity>
        </View>
      ) : computing ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Computing relationships…
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.hint}>
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Drag to pan · Tap nodes to open · Tap edge labels to inspect
            </Text>
          </View>
          <GraphCanvas
            nodes={nodes}
            edges={filteredEdges}
            images={images}
            selectedEdge={selectedEdge}
            onSelectEdge={handleSelectEdge}
            onSelectNode={handleSelectNode}
          />
        </>
      )}

      {/* Edge detail sheet */}
      {selectedEdge && (
        <EdgeDetailSheet
          edge={selectedEdge}
          images={images}
          onClose={() => setSelectedEdge(null)}
          onNavigate={handleSelectNode}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    zIndex: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  legend: { gap: 4, alignItems: "flex-end" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLine: { width: 18, height: 2, borderRadius: 1 },
  legendDash: {
    width: 18,
    height: 0,
    borderTopWidth: 2,
    borderStyle: "dashed",
  },
  legendLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  filterRow: { flexDirection: "row", gap: 6 },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  hint: { paddingVertical: 6, alignItems: "center" },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
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
});
