import { Text } from "../../components/typography";
import { Pressable, ScrollView, View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { legalDocuments, type LegalBlock } from "@wiki-collection/ui/lib/legal";
import { AppBackground } from "../../components/app-background";
const body = { fontSize: 14, lineHeight: 22.75, color: "#334155" };
function Block({ block }: { block: LegalBlock }) {
  if (block.text)
    return (
      <Text
        style={[
          body,
          block.tag === "h2" && {
            fontSize: 16,
            lineHeight: 24,
            fontWeight: "800",
            color: "#1e293b",
            marginBottom: 4,
          },
          block.tag === "li" && { marginLeft: 20 },
        ]}
      >
        {block.tag === "li" ? "• " : ""}
        {block.text}
      </Text>
    );
  if (block.tag === "tr")
    return (
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: "#f1f5f9",
        }}
      >
        {block.children?.map((child, i) => (
          <View
            key={i}
            style={{
              width: child.tag === "th" ? 128 : undefined,
              flex: child.tag === "th" ? undefined : 1,
              paddingVertical: 8,
              paddingRight: child.tag === "th" ? 12 : 0,
            }}
          >
            <Text style={[body, child.tag === "th" && { fontWeight: "700" }]}>
              {child.text}
            </Text>
            {child.children?.map((b, j) => (
              <Block key={j} block={b} />
            ))}
          </View>
        ))}
      </View>
    );
  return (
    <View>
      {block.children?.map((child, i) => (
        <Block key={i} block={child} />
      ))}
    </View>
  );
}
export default function Legal() {
  const { document } = useLocalSearchParams<{ document: string }>();
  const insets = useSafeAreaInsets();
  const page = Object.hasOwn(legalDocuments, document)
    ? legalDocuments[document as keyof typeof legalDocuments]
    : null;
  return (
    <View style={{ flex: 1 }}>
      <AppBackground />
      <View
        style={{
          backgroundColor: "rgba(255,255,255,.9)",
          paddingTop: insets.top,
          marginBottom: 16,
        }}
      >
        <View
          style={{
            height: 56,
            width: "100%",
            maxWidth: 448,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 16,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="もどる"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/login")
            }
            style={{ marginLeft: -8, padding: 4, borderRadius: 999 }}
          >
            <ChevronLeft size={24} color="#64748b" />
          </Pressable>
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 18,
              fontWeight: "800",
              color: "#1e293b",
            }}
          >
            {page?.title ?? "ページが見つかりません"}
          </Text>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48 + insets.bottom,
          width: "100%",
          maxWidth: 448,
          alignSelf: "center",
          paddingHorizontal: 16,
        }}
      >
        {page && (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: "rgba(255,255,255,.9)",
              padding: 24,
              gap: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,.1)",
            }}
          >
            {page.blocks.map((b, i) => (
              <Block key={i} block={b} />
            ))}
            <Text style={{ fontSize: 12, lineHeight: 16, color: "#94a3b8" }}>
              最終更新日: {page.updatedAt}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
