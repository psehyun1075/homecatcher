import { StyleSheet } from "react-native";

import { colors } from "../../theme/colors";
import { radius } from "../../theme/radius";
import { spacing } from "../../theme/spacing";

export const calendarStyles = StyleSheet.create({
  grid: {
    gap: spacing.xs,
  },
  week: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  weekday: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  dayCell: {
    flex: 1,
    minHeight: 94,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xs,
    gap: 3,
  },
  outsideDay: {
    opacity: 0.45,
  },
  selectedDay: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.accent,
  },
  today: {
    color: colors.primaryDark,
  },
  dateText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  chip: {
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  chipText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "700",
  },
  itemCard: {
    gap: spacing.sm,
  },
  typeText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800",
  },
});
