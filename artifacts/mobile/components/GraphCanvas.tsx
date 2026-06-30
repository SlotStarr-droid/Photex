import { Image } from "expo-image";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Defs, Line, Marker, Path, Polygon } from "react-native-svg";

import { useColors } from "@/hooks/useColors";
import type { GraphEdge, GraphNode, StoredImage } from "@/types/image";
import { EDGE_COLORS } from "@/utils/graph";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CANVAS_W = SCREEN_W * 2.5;
const CANVAS_H = SCREEN_H * 2.5;
const NODE_SIZE = 56;

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  images: StoredImage[];
  selectedEdge: GraphEdge | null;
  onSelectEdge: (edge: GraphEdge | null) => void;
  onSelectNode: (imageId: string) => void;
}

export function GraphCanvas({
  nodes,
  edges,
  images,
  selectedEdge,
  onSelectEdge,
  onSelectNode,
}: Props) {
  const colors = useColors();
  const imageMap = useMemo(
    () => new Map(images.map((i) => [i.id, i])),
    [images]
  );

  const [pan, setPan] = useState({
    x: -(CANVAS_W / 2 - SCREEN_W / 2),
    y: -(CANVAS_H / 2 - SCREEN_H / 2),
  });
  const panRef = useRef(pan);
  panRef.current = pan;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {},
        onPanResponderMove: (_, gestureState) => {
          setPan({
            x: panRef.current.x + gestureState.dx,
            y: panRef.current.y + gestureState.dy,
          });
        },
        onPanResponderRelease: (_, gestureState) => {
          panRef.current = {
            x: panRef.current.x + gestureState.dx,
            y: panRef.current.y + gestureState.dy,
          };
          setPan({ ...panRef.current });
        },
      }),
    []
  );

  const handleEdgeTap = useCallback(
    (edge: GraphEdge) => {
      onSelectEdge(selectedEdge?.id === edge.id ? null : edge);
    },
    [selectedEdge, onSelectEdge]
  );

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.imageId, n])),
    [nodes]
  );

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.canvas,
          { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* SVG edges layer */}
        <Svg
          width={CANVAS_W}
          height={CANVAS_H}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Defs>
            <Marker
              id="arrow-verified"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <Polygon
                points="0 0, 6 3, 0 6"
                fill={EDGE_COLORS.verified}
                opacity={0.7}
              />
            </Marker>
            <Marker
              id="arrow-inferred"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
            >
              <Polygon
                points="0 0, 6 3, 0 6"
                fill={EDGE_COLORS.inferred}
                opacity={0.7}
              />
            </Marker>
          </Defs>

          {edges.map((edge) => {
            const src = nodeMap.get(edge.sourceId);
            const tgt = nodeMap.get(edge.targetId);
            if (!src || !tgt) return null;
            const isSelected = selectedEdge?.id === edge.id;
            const color = EDGE_COLORS[edge.evidenceType];
            const opacity = isSelected ? 1 : 0.55;
            const strokeW = isSelected ? 2.5 : 1.5;

            const x1 = src.x + NODE_SIZE / 2;
            const y1 = src.y + NODE_SIZE / 2;
            const x2 = tgt.x + NODE_SIZE / 2;
            const y2 = tgt.y + NODE_SIZE / 2;

            if (edge.evidenceType === "verified") {
              return (
                <Line
                  key={edge.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={color}
                  strokeWidth={strokeW}
                  strokeOpacity={opacity}
                  markerEnd="url(#arrow-verified)"
                />
              );
            }

            // Dashed line for inferred
            return (
              <Line
                key={edge.id}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={color}
                strokeWidth={strokeW}
                strokeDasharray="6,4"
                strokeOpacity={opacity}
                markerEnd="url(#arrow-inferred)"
              />
            );
          })}
        </Svg>

        {/* Invisible touch targets for edges */}
        {edges.map((edge) => {
          const src = nodeMap.get(edge.sourceId);
          const tgt = nodeMap.get(edge.targetId);
          if (!src || !tgt) return null;
          const cx = (src.x + tgt.x) / 2 + NODE_SIZE / 2;
          const cy = (src.y + tgt.y) / 2 + NODE_SIZE / 2;
          return (
            <TouchableOpacity
              key={`touch-${edge.id}`}
              style={[
                styles.edgeTouchTarget,
                { left: cx - 20, top: cy - 20 },
                selectedEdge?.id === edge.id && {
                  backgroundColor: EDGE_COLORS[edge.evidenceType] + "30",
                  borderColor: EDGE_COLORS[edge.evidenceType],
                  borderWidth: 1,
                },
              ]}
              onPress={() => handleEdgeTap(edge)}
              activeOpacity={0.7}
            >
              <Text style={[styles.edgeLabel, { color: EDGE_COLORS[edge.evidenceType] }]}>
                {Math.round(edge.confidence * 100)}%
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Image nodes */}
        {nodes.map((node) => {
          const img = imageMap.get(node.imageId);
          if (!img) return null;
          const isConnected =
            edges.some(
              (e) => e.sourceId === node.imageId || e.targetId === node.imageId
            );
          return (
            <TouchableOpacity
              key={node.id}
              style={[
                styles.node,
                {
                  left: node.x,
                  top: node.y,
                  borderColor: isConnected ? colors.primary : colors.border,
                  borderWidth: isConnected ? 2 : 1,
                },
              ]}
              onPress={() => onSelectNode(node.imageId)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: img.uri }}
                style={styles.nodeImage}
                contentFit="cover"
              />
              {!isConnected && (
                <View style={[styles.isolatedDot, { backgroundColor: colors.mutedForeground }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
    position: "absolute",
  },
  node: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
  },
  nodeImage: {
    width: "100%",
    height: "100%",
  },
  isolatedDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.6,
  },
  edgeTouchTarget: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  edgeLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
});
