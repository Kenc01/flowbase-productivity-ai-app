import { useAuth, useUser } from "@clerk/expo";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function SettingRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  colors,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onPress?.(); }}
      style={({ pressed }) => [
        pStyles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[pStyles.rowIcon, { backgroundColor: destructive ? colors.destructive + "18" : colors.accent }]}>
        <Feather name={icon as any} size={16} color={destructive ? colors.destructive : colors.primary} />
      </View>
      <Text style={[pStyles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value && <Text style={[pStyles.rowValue, { color: colors.mutedForeground }]}>{value}</Text>}
      {!destructive && <Feather name="chevron-right" size={14} color={colors.mutedForeground} />}
    </Pressable>
  );
}

export default function Profile() {
  const { signOut } = useAuth();
  const { user, isLoaded } = useUser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleSignOut = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await signOut();
    router.replace("/(auth)/sign-in");
  };

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() ?? "?";

  return (
    <ScrollView
      style={[pStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: topPad + 16 }} />

      <View style={pStyles.header}>
        <View style={[pStyles.avatarRing, { borderColor: colors.primary + "40" }]}>
          <View style={[pStyles.avatar, { backgroundColor: colors.primary }]}>
            {!isLoaded ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={pStyles.avatarText}>{initials}</Text>
            )}
          </View>
        </View>
        <Text style={[pStyles.name, { color: colors.foreground }]}>
          {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "Your Name"}
        </Text>
        <Text style={[pStyles.email, { color: colors.mutedForeground }]}>
          {user?.emailAddresses?.[0]?.emailAddress ?? ""}
        </Text>

        <View style={pStyles.statsRow}>
          {[
            { label: "Notes", value: "12" },
            { label: "Tasks", value: "38" },
            { label: "Days", value: "14" },
          ].map((s) => (
            <View key={s.label} style={[pStyles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[pStyles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[pStyles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={pStyles.section}>
        <Text style={[pStyles.sectionTitle, { color: colors.mutedForeground }]}>WORKSPACE</Text>
        <View style={[pStyles.group, { borderColor: colors.border }]}>
          <SettingRow icon="layout" label="Templates" colors={colors} />
          <View style={[pStyles.separator, { backgroundColor: colors.border }]} />
          <SettingRow icon="calendar" label="Calendar" colors={colors} />
          <View style={[pStyles.separator, { backgroundColor: colors.border }]} />
          <SettingRow icon="cpu" label="AI Assistant" colors={colors} />
        </View>
      </View>

      <View style={pStyles.section}>
        <Text style={[pStyles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <View style={[pStyles.group, { borderColor: colors.border }]}>
          <SettingRow icon="bell" label="Notifications" value="On" colors={colors} />
          <View style={[pStyles.separator, { backgroundColor: colors.border }]} />
          <SettingRow icon="moon" label="Appearance" value="System" colors={colors} />
          <View style={[pStyles.separator, { backgroundColor: colors.border }]} />
          <SettingRow icon="globe" label="Language" value="English" colors={colors} />
        </View>
      </View>

      <View style={pStyles.section}>
        <Text style={[pStyles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <View style={[pStyles.group, { borderColor: colors.border }]}>
          <SettingRow icon="shield" label="Privacy & Security" colors={colors} />
          <View style={[pStyles.separator, { backgroundColor: colors.border }]} />
          <SettingRow icon="help-circle" label="Help & Support" colors={colors} />
          <View style={[pStyles.separator, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="log-out"
            label="Sign out"
            onPress={handleSignOut}
            destructive
            colors={colors}
          />
        </View>
      </View>

      <View style={pStyles.version}>
        <Ionicons name="layers" size={14} color={colors.mutedForeground} />
        <Text style={[pStyles.versionText, { color: colors.mutedForeground }]}>FlowBase v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const pStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 8 },
  avatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatar: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 28, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#fff" },
  name: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 4 },
  email: { fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 12, width: "100%" },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 16, alignItems: "center", gap: 4 },
  statValue: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
  group: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontFamily: "Inter_400Regular", marginRight: 8 },
  separator: { height: 1, marginLeft: 60 },
  version: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 32, marginBottom: 8 },
  versionText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
