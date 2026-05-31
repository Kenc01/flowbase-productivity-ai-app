import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SAMPLE_NOTES = [
  {
    id: "1",
    title: "Product roadmap Q3",
    body: "Define OKRs, align with design team on new dashboard features, schedule sprint planning for July 14th.",
    tag: "Work",
    tagColor: "#7467F0",
    date: "Today",
    pinned: true,
  },
  {
    id: "2",
    title: "Book recommendations",
    body: "Deep Work by Cal Newport, Atomic Habits, The Pragmatic Programmer — ask team for more suggestions.",
    tag: "Personal",
    tagColor: "#10B981",
    date: "Yesterday",
    pinned: false,
  },
  {
    id: "3",
    title: "API design notes",
    body: "Use REST with versioning (/v1/…), consider GraphQL for the dashboard, rate limiting on all public endpoints.",
    tag: "Dev",
    tagColor: "#06B6D4",
    date: "Mon",
    pinned: false,
  },
  {
    id: "4",
    title: "Meeting agenda — design sync",
    body: "Review Figma mockups for onboarding flow, discuss color tokens, approve font pairing.",
    tag: "Work",
    tagColor: "#7467F0",
    date: "Sun",
    pinned: false,
  },
  {
    id: "5",
    title: "Ideas for side project",
    body: "Mobile-first time tracker with AI auto-categorization. Explore React Native + Expo stack.",
    tag: "Ideas",
    tagColor: "#F59E0B",
    date: "Fri",
    pinned: false,
  },
];

function NoteCard({ note, colors }: { note: typeof SAMPLE_NOTES[0]; colors: ReturnType<typeof useColors> }) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 20 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 20 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => Haptics.selectionAsync()}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.tag, { backgroundColor: note.tagColor + "22" }]}>
            <Text style={[styles.tagText, { color: note.tagColor }]}>{note.tag}</Text>
          </View>
          <View style={styles.cardMeta}>
            {note.pinned && (
              <Ionicons name="bookmark" size={14} color={colors.primary} style={{ marginRight: 8 }} />
            )}
            <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{note.date}</Text>
          </View>
        </View>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{note.title}</Text>
        <Text style={[styles.cardBody, { color: colors.mutedForeground }]} numberOfLines={2}>
          {note.body}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function Notes() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Pinned", "Work", "Personal", "Dev", "Ideas"];

  const filtered = SAMPLE_NOTES.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.body.toLowerCase().includes(search.toLowerCase());
    if (activeFilter === "All") return matchesSearch;
    if (activeFilter === "Pinned") return matchesSearch && n.pinned;
    return matchesSearch && n.tag === activeFilter;
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.heading, { color: colors.foreground }]}>Notes</Text>
          <Pressable
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={20} color={colors.primaryForeground} />
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search notes…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingRight: 16 }}>
          {filters.map((f) => (
            <Pressable
              key={f}
              onPress={() => { setActiveFilter(f); Haptics.selectionAsync(); }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f ? colors.primary : colors.card,
                  borderColor: activeFilter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: activeFilter === f ? colors.primaryForeground : colors.mutedForeground }]}>
                {f}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="file-text" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notes yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              Tap the + button to create your first note
            </Text>
          </View>
        ) : (
          filtered.map((note) => (
            <NoteCard key={note.id} note={note} colors={colors} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  heading: { fontSize: 28, fontWeight: "700", fontFamily: "Inter_700Bold" },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filterRow: { marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium" },
  list: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardMeta: { flexDirection: "row", alignItems: "center" },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardTitle: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  cardBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
