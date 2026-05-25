import { useSignUp } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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

export default function SignUp() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);

  const isLoading = fetchStatus === "fetching";

  const handleSubmit = async () => {
    const { error } = await signUp.password({ emailAddress, password });
    if (error) return;
    await signUp.verifications.sendEmailCode();
    setVerifying(true);
  };

  const handleVerify = async () => {
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl("/");
          router.replace("/(tabs)");
        },
      });
    }
  };

  const makeStyles = () =>
    StyleSheet.create({
      scroll: { flexGrow: 1 },
      container: {
        flex: 1,
        paddingTop: insets.top + 60,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 28,
      },
      badge: {
        alignSelf: "flex-start",
        backgroundColor: colors.accent,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 5,
        marginBottom: 24,
      },
      badgeText: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: colors.primary,
        fontFamily: "Inter_600SemiBold",
        letterSpacing: 0.5,
      },
      title: {
        fontSize: 32,
        fontWeight: "700" as const,
        fontFamily: "Inter_700Bold",
        color: colors.foreground,
        marginBottom: 8,
      },
      subtitle: {
        fontSize: 15,
        color: colors.mutedForeground,
        fontFamily: "Inter_400Regular",
        marginBottom: 40,
        lineHeight: 22,
      },
      label: {
        fontSize: 13,
        fontWeight: "600" as const,
        fontFamily: "Inter_600SemiBold",
        color: colors.foreground,
        marginBottom: 8,
        marginTop: 20,
      },
      input: {
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: colors.radius,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        fontFamily: "Inter_400Regular",
        color: colors.foreground,
        backgroundColor: colors.card,
      },
      errorText: {
        fontSize: 12,
        color: colors.destructive,
        fontFamily: "Inter_400Regular",
        marginTop: 6,
      },
      button: {
        backgroundColor: colors.primary,
        borderRadius: colors.radius,
        paddingVertical: 16,
        alignItems: "center" as const,
        marginTop: 32,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 4,
      },
      buttonDisabled: { opacity: 0.5 },
      buttonText: {
        color: colors.primaryForeground,
        fontSize: 15,
        fontWeight: "600" as const,
        fontFamily: "Inter_600SemiBold",
      },
      codeHint: {
        fontSize: 13,
        color: colors.mutedForeground,
        fontFamily: "Inter_400Regular",
        marginTop: 12,
        lineHeight: 20,
        textAlign: "center" as const,
      },
      resend: {
        marginTop: 16,
        alignItems: "center" as const,
      },
      resendText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: "600" as const,
        fontFamily: "Inter_600SemiBold",
      },
      divider: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
        marginTop: 48,
      },
      footer: {
        flexDirection: "row" as const,
        justifyContent: "center" as const,
        marginTop: 28,
      },
      footerText: {
        fontSize: 14,
        color: colors.mutedForeground,
        fontFamily: "Inter_400Regular",
      },
      footerLink: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: "600" as const,
        fontFamily: "Inter_600SemiBold",
      },
    });

  const styles = makeStyles();

  if (verifying) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.container}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>FLOWBASE</Text>
            </View>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {emailAddress}
            </Text>

            <Text style={styles.label}>Verification code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="000000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              autoComplete="one-time-code"
              testID="code-input"
            />
            {errors?.fields?.code && (
              <Text style={styles.errorText}>{errors.fields.code.message}</Text>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (isLoading || !code) && styles.buttonDisabled,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleVerify}
              disabled={isLoading || !code}
              testID="verify-button"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.resend}
              onPress={() => signUp.verifications.sendEmailCode()}
            >
              <Text style={styles.resendText}>Resend code</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FLOWBASE</Text>
          </View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start your productivity journey</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={emailAddress}
            onChangeText={setEmailAddress}
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            testID="email-input"
          />
          {errors?.fields?.emailAddress && (
            <Text style={styles.errorText}>{errors.fields.emailAddress.message}</Text>
          )}

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            autoComplete="new-password"
            testID="password-input"
          />
          {errors?.fields?.password && (
            <Text style={styles.errorText}>{errors.fields.password.message}</Text>
          )}
          {errors?.global && (
            <Text style={styles.errorText}>{errors.global.message}</Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              (isLoading || !emailAddress || !password) && styles.buttonDisabled,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSubmit}
            disabled={isLoading || !emailAddress || !password}
            testID="sign-up-button"
          >
            {isLoading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </Pressable>

          <View nativeID="clerk-captcha" />

          <View style={styles.divider} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/sign-in" asChild>
              <Pressable>
                <Text style={styles.footerLink}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
