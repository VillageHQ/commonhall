import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { checkCommunity, readAddress, type Community } from "../lib/community";
import { SANS, SERIF, useColors, type Colors } from "../theme";

type JoinScreenProps = {
  communities: Community[];
  initialAddress?: string;
  onJoined: (community: Community, path: string | null) => void;
};

// First open: "Join your community". The address is checked to be a Commonhall server before anything opens.
export function JoinScreen({ communities, initialAddress = "", onJoined }: JoinScreenProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const [address, setAddress] = useState(initialAddress);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function join() {
    setError(null);
    const read = readAddress(address);
    if (!read.ok) {
      setError(read.message);
      return;
    }
    setIsChecking(true);
    const checked = await checkCommunity(read.origin);
    setIsChecking(false);
    if (!checked.ok) {
      setError(checked.message);
      return;
    }
    onJoined(checked.community, read.path);
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Image source={require("../../assets/splash-icon.png")} style={[styles.mark, { tintColor: colors.ink }]} accessibilityIgnoresInvertColors accessible={false} />
        <Text style={styles.brand}>Commonhall</Text>
        <Text style={styles.title} accessibilityRole="header">
          Join your community
        </Text>
        <Text style={styles.lede}>Type the address your fund sent you, or paste your invite link.</Text>

        <Text style={styles.label} nativeID="address-label">
          Community address
        </Text>
        <TextInput
          testID="community-address"
          accessibilityLabelledBy="address-label"
          accessibilityLabel="Community address"
          style={[styles.input, error ? styles.inputError : null]}
          value={address}
          onChangeText={(text) => {
            setAddress(text);
            setError(null);
          }}
          placeholder="community.example.com"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          textContentType="URL"
          onSubmitEditing={() => void join()}
          editable={!isChecking}
        />
        {error ? (
          <Text style={styles.error} accessibilityRole="alert" testID="join-error">
            {error}
          </Text>
        ) : null}
        <Pressable accessibilityRole="button" testID="join-button" disabled={isChecking} onPress={() => void join()} style={[styles.button, isChecking ? styles.buttonBusy : null]}>
          {isChecking ? <ActivityIndicator color={colors.paper} /> : <Text style={styles.buttonText}>Continue</Text>}
        </Pressable>

        {communities.length > 0 ? (
          <View style={styles.list}>
            <Text style={styles.label}>On this phone</Text>
            {communities.map((community) => (
              <Pressable key={community.origin} accessibilityRole="button" onPress={() => onJoined(community, null)} style={styles.listRow}>
                <Text style={styles.listName}>{community.name}</Text>
                <Text style={styles.listHost}>{new URL(community.origin).host}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={styles.footnote}>Commonhall is invite-only: each fund runs its own community. Your fund&apos;s team can tell you its address.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    content: { paddingHorizontal: 24, maxWidth: 520, width: "100%", alignSelf: "center" },
    mark: { width: 56, height: 56, marginLeft: -8, marginBottom: 2 },
    brand: { color: colors.ink, fontFamily: SANS, fontSize: 15, fontWeight: "600", letterSpacing: 0.3, marginBottom: 36 },
    title: { color: colors.ink, fontFamily: SERIF, fontSize: 34, fontWeight: "500", lineHeight: 40 },
    lede: { color: colors.muted, fontFamily: SANS, fontSize: 16, lineHeight: 23, marginTop: 10, marginBottom: 28 },
    label: { color: colors.ink, fontFamily: SANS, fontSize: 14, fontWeight: "600", marginBottom: 8 },
    input: { height: 50, borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 14, color: colors.ink, backgroundColor: colors.sheet, fontFamily: SANS, fontSize: 16 },
    inputError: { borderColor: colors.rust },
    error: { color: colors.rust, fontFamily: SANS, fontSize: 14, lineHeight: 20, marginTop: 8 },
    button: { height: 48, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginTop: 16 },
    buttonBusy: { opacity: 0.7 },
    buttonText: { color: colors.paper, fontFamily: SANS, fontSize: 15, fontWeight: "600" },
    list: { marginTop: 36 },
    listRow: { borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 14 },
    listName: { color: colors.ink, fontFamily: SANS, fontSize: 16, fontWeight: "600" },
    listHost: { color: colors.muted, fontFamily: SANS, fontSize: 13, marginTop: 2 },
    footnote: { color: colors.muted, fontFamily: SANS, fontSize: 13, lineHeight: 19, marginTop: 36 },
  });
}
