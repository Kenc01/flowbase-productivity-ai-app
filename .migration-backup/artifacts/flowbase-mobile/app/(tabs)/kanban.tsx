import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    color: "#7467F0",
    count: 5,
    tasks: [
      { id: "t1", title: "Design system audit", tag: "Design", priority: "high" },
      { id: "t2", title: "Write API documentation", tag: "Dev", priority: "medium" },
      { id: "t3", title: "User interview prep", tag: "Research", priority: "low" },
      { id: "t4", title: "Update changelog", tag: "Docs", priority: "low" },
      { id: "t5", title: "Fix mobile nav bug", tag: "Bug", priority: "high" },
    ],
  },
  {
    id: "progress",
    title: "In Progress",
    color: "#F59E0B",
    count: 3,
    tasks: [
      { id: "p1", title: "Dashboard redesign", tag: "Design", priority: "high" },
      { id: "p2", title: "Auth flow implementation", tag: "Dev", priority: "high" },
      { id: "p3", title: "Performance profiling", tag: "Dev", priority: "medium" },
    ],
  },
  {
    id: "done",
    title: "Done",
    color: "#10B981",
    count: 4,
    tasks: [
      { id: "d1", title: "Set up CI/CD pipeline", tag: "Infra", priority: "medium" },
      { id: "d2", title: "Onboarding flow v1", tag: "Design", priority: "high" },
      { id: "d3", title: "Database schema review", tag: "Dev", priority: "medium" },
      { id: "d4", title: "Competitive analysis", tag: "Research", priority: "low" },
    ],
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "#F43F5E",
  medium: "#F59E0B",
  low: "#10B981",
};

const TAG_COLORS: Record<string, string> = {
  Design: "#7467F0",
  Dev: "#06B6D4",
  Research: "#A855F7",
  Docs: "#6B7B99",
  Bug: "#F43F5E",
  Infra: "#F59E0B",
};

function KanbanCard({ task, colors }: { task: typeof COLUMNS[0]["tasks"][0]; colors: ReturnType<typeof useColors> }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 20 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 20 }).start();
  const tagColor = TAG_COLORS[task.tag] || colors.mutedForeground;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => Haptics.selectionAsync()}
        style={[kStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={kStyles.cardTop}>
          <View style={[kStyles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
          <Text style={[kStyles.cardTitle, { color: colors.foreground }]}>{task.title}</Text>
        </View>
        <View style={kStyles.cardFooter}>
          <View style={[kStyles.tag, { backgroundColor: tagColor + "22" }]}>
            <Text style={[kStyles.tagText, { color: tagColor }]}>{task.tag}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function Kanban() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[kStyles.container, { backgroundColor: colors.background }]}>
      <View style={[kStyles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View style={kStyles.headerRow}>
          <Text style={[kStyles.heading, { color: colors.foreground }]}>Kanban</Text>
          <View style={kStyles.headerActions}>
            <Pressable
              onPress={() => Haptics.selectionAsync()}
              style={[kStyles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="filter" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
              style={[kStyles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>

        <View style={kStyles.summary}>
          {COLUMNS.map((col) => (
            <View key={col.id} style={kStyles.summaryItem}>
              <View style={[kStyles.summaryDot, { backgroundColor: col.color }]} />
              <Text style={[kStyles.summaryCount, { color: colors.foreground }]}>{col.count}</Text>
              <Text style={[kStyles.summaryLabel, { color: colors.mutedForeground }]}>{col.title}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[kStyles.board, { paddingBottom: bottomPad + 100 }]}
        decelerationRate="fast"
      >
        {COLUMNS.map((col) => (
          <View
            key={col.id}
            style={[kStyles.column, { backgroundColor: colors.muted, borderColor: colors.border }]}
          >
            <View style={kStyles.colHeader}>
              <View style={[kStyles.colDot, { backgroundColor: col.color }]} />
              <Text style={[kStyles.colTitle, { color: colors.foreground }]}>{col.title}</Text>
              <View style={[kStyles.colBadge, { backgroundColor: col.color + "22" }]}>
                <Text style={[kStyles.colBadgeText, { color: col.color }]}>{col.count}</Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
              nestedScrollEnabled
            >
              {col.tasks.map((task) => (
                <KanbanCard key={task.id} task={task} colors={colors} />
              ))}
            </ScrollView>

            <Pressable
              onPress={() => Haptics.selectionAsync()}
              style={[kStyles.colAdd, { borderColor: colors.border }]}
            >
              <Feather name="plus" size={14} color={colors.mutedForeground} />
              <Text style={[kStyles.colAddText, { color: colors.mutedForeground }]}>Add task</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const COLUMN_WIDTH = 280;

const kStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  heading: { fontSize: 28, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  summary: { flexDirection: "row", gap: 20 },
  summaryItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryCount: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  board: { paddingHorizontal: 16, paddingTop: 8, gap: 12, alignItems: "flex-start" },
  column: {
    width: COLUMN_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    maxHeight: 520,
  },
  colHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  colDot: { width: 8, height: 8, borderRadius: 4 },
  colTitle: { flex: 1, fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  colBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  colBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  priorityDot: { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
  cardTitle: { flex: 1, fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium", lineHeight: 19 },
  cardFooter: { flexDirection: "row", alignItems: "center" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  colAdd: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, borderTopWidth: 1, marginTop: 8 },
  colAddText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
