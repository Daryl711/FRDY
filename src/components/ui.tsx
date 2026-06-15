import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View, ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, gradients } from "@/theme/colors";

export function ScreenBg({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-bg">
      <LinearGradient colors={gradients.screen} className="absolute inset-0" />
      <SafeAreaView edges={["top"]} className="flex-1">
        {children}
      </SafeAreaView>
    </View>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`font-mono text-[10.5px] tracking-[2.5px] text-mut uppercase ${className}`}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between mt-6 mb-3">
      <Text className="font-serifsemi text-[21px] text-ink">{children}</Text>
      {action}
    </View>
  );
}

export function GoldButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient colors={gradients.goldBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-[13px] px-5 py-3">
        <Text className="font-bold text-[14px]" style={{ color: "#3a2d08" }}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "gold" | "ok" }) {
  const styles = {
    neutral: "bg-white/5 border-white/10",
    gold: "border-gold/35",
    ok: "border-ok/35",
  }[tone];
  const text = { neutral: "text-[#cfe6d2]", gold: "text-goldbright", ok: "text-ok" }[tone];
  return (
    <View
      className={`rounded-[18px] border px-3 py-[7px] ${styles}`}
      style={tone === "gold" ? { backgroundColor: "rgba(216,180,90,0.14)" } : tone === "ok" ? { backgroundColor: "rgba(63,191,106,0.14)" } : undefined}
    >
      <Text className={`text-[12px] ${text}`}>{label}</Text>
    </View>
  );
}

export function Avatar({
  initials,
  size = 50,
  gradient = false,
  color = colors.surface2,
  online = false,
  textClass = "",
}: {
  initials: string;
  size?: number;
  gradient?: boolean;
  color?: string;
  online?: boolean;
  textClass?: string;
}) {
  const dot = (
    <View
      style={{
        position: "absolute",
        bottom: size * 0.045,
        right: size * 0.045,
        width: size * 0.24,
        height: size * 0.24,
        borderRadius: 999,
        backgroundColor: colors.ok,
        borderWidth: 2.5,
        borderColor: colors.surface,
      }}
    />
  );
  const content = (
    <Text style={{ fontSize: size * 0.32, textAlign: "center", textAlignVertical: "center", includeFontPadding: false, transform: [{ translateY: size * 0.28 }] }} className={`font-bold ${textClass}`}>{initials}</Text>
  );
  if (gradient) {
    return (
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <LinearGradient colors={gradients.gold} style={{ width: size, height: size, borderRadius: 999 }} className="items-center justify-center">
          <Text style={{ fontSize: size * 0.32, color: "#3a2d08", textAlign: "center", textAlignVertical: "center", includeFontPadding: false, transform: [{ translateY: size * 0.28 }] }} className="font-bold">{initials}</Text>
        </LinearGradient>
        {online && dot}
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, backgroundColor: color, borderRadius: 999 }} className="items-center justify-center">
      {content}
      {online && dot}
    </View>
  );
}

export function Card({ children, className = "", ...rest }: ViewProps & { className?: string }) {
  return (
    <View className={`bg-surface border border-line rounded-2xl ${className}`} {...rest}>
      {children}
    </View>
  );
}
