import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import { radius } from "../theme/radius";
import { spacing } from "../theme/spacing";

interface RemoteImageProps {
  uri?: string | null;
  label: string;
  size?: number;
}

export function RemoteImage({ uri, label, size = 72 }: RemoteImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <View style={[styles.placeholder, { width: size, height: size }]} accessibilityLabel={`${label} 이미지 없음`}>
        <Text style={styles.placeholderText}>이미지 없음</Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={label}
      source={{ uri }}
      onError={() => setFailed(true)}
      resizeMode="cover"
      style={[styles.image, { width: size, height: size }]}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.sm,
  },
  placeholderText: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "center",
  },
});
