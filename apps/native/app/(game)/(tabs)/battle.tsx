import { SafeAreaView } from "react-native-screens/experimental";
import { Platform } from "react-native";
import { Text, TextInput } from "../../../components/typography";
import { useState, useEffect } from "react";
import { Pressable, View, Image, StyleSheet, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { elements, type Fighter } from "@wiki-collection/db/battle";
import {
  groupFusionMaterials,
  moveTeamMember,
  toggleTeamMember,
} from "@wiki-collection/ui/lib/battle-selection";
import { apiUrl, auth, useTRPC } from "../../../lib/client";
import { useAction } from "../../../lib/mutation";
import { Button, Confirm, Loading, Screen, Stats } from "../../../components/ui";
import { ElementBadge } from "../../../components/element";
import { Match } from "../../../components/match";
import {
  Plus,
  Sparkles,
  CircleHelp,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
  Swords,
  Shield,
} from "lucide-react-native";
import Svg, { Rect, Path } from "react-native-svg";
import { cardImageDisplayUrl } from "@wiki-collection/db/card-image";

import { BattleHelpContent } from "../../../components/battle-help-content";
import { BattleSheet } from "../../../components/battle-sheet";
import { BattleArtwork, BattleCardOption } from "../../../components/battle-card-option";
import { Select } from "../../../components/select";
const sample: Fighter[] = ["person", "nature", "culture"].map((element, i) => ({
  id: `sample-${i}`,
  title: ["練習用・人物カード", "練習用・自然カード", "練習用・文化カード"][i]!,
  element: element as Fighter["element"],
  attack: 100000,
  defense: 50000,
}));
export default function Battle() {
  const trpc = useTRPC();
  const params = useLocalSearchParams<{ tab?: string; date?: string; mine?: string }>();
  const { width } = useWindowDimensions();
  const pickerWidth = (Math.min(width, 672) - 40 - 24) / 3;
  const session = auth.useSession();
  const inventory = useQuery(trpc.battle.inventory.queryOptions());
  const teams = useQuery(trpc.battle.teams.queryOptions());
  const [tab, setTab] = useState<"teams" | "ranking">("teams");
  const [date, setDate] = useState("");
  const [mine, setMine] = useState(false);
  useEffect(() => {
    setTab(params.tab === "ranking" ? "ranking" : "teams");
    setDate(params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : "");
    setMine(params.mine === "true");
  }, [params.tab, params.date, params.mine]);
  const ranking = useQuery(
    trpc.battle.ranking.queryOptions({ date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined }),
  );
  const latest = useQuery(trpc.battle.ranking.queryOptions({}));
  const save = useMutation(trpc.battle.saveTeam.mutationOptions());
  const remove = useMutation(trpc.battle.deleteTeam.mutationOptions());
  const fuse = useMutation(trpc.battle.fuse.mutationOptions());
  const action = useAction();
  const [sheet, setSheet] = useState<"team" | "fusion" | "practice" | "help" | null>(null);
  const [slot, setSlot] = useState(1);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [original, setOriginal] = useState("");
  const [discard, setDiscard] = useState(false);
  const [removeSlot, setRemoveSlot] = useState<number | null>(null);
  const [baseId, setBaseId] = useState("");
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [fusionResult, setFusionResult] = useState<{
    materialCount: number;
    attackGain: number;
    defenseGain: number;
  } | null>(null);
  const [practiceId, setPracticeId] = useState("");
  const [opponentId, setOpponentId] = useState("");
  const [practice, setPractice] = useState(false);
  const cards = inventory.data ?? [];
  const saved = teams.data ?? [];
  const base = cards.find((c) => c.id === baseId);
  const groups = groupFusionMaterials(cards, baseId);
  const selectedGroups = groups
    .map((g) => ({ ...g, count: g.available.filter((c) => materialIds.includes(c.id)).length }))
    .filter((g) => g.count > 0);
  const ready = inventory.isSuccess && teams.isSuccess;
  const close = () => {
    if (action.pending) return;
    if (sheet === "team" && JSON.stringify({ name, members }) !== original) setDiscard(true);
    else setSheet(null);
  };
  const edit = (n: number) => {
    const t = saved.find((t) => t.slot === n);
    const name = t?.name ?? `チーム${n}`;
    const members = t ? [t.member1, t.member2, t.member3] : [];
    setSlot(n);
    setName(name);
    setMembers(members);
    setOriginal(JSON.stringify({ name, members }));
    action.clearError();
    setSheet("team");
  };
  const strengthen = (id = "") => {
    setBaseId(id);
    setMaterialIds([]);
    setConfirm(false);
    setFusionResult(null);
    action.clearError();
    setSheet("fusion");
  };
  const setMaterialCount = (group: (typeof groups)[number], count: number) => {
    const others = materialIds.filter((id) => !group.available.some((c) => c.id === id));
    setMaterialIds([
      ...others,
      ...group.available
        .slice(0, Math.min(Math.max(0, count), group.available.length, 50 - others.length))
        .map((c) => c.id),
    ]);
    setFusionResult(null);
  };
  const opponents = (latest.data?.ranking ?? []).filter(
    (t) =>
      t.ruleVersion === 2 &&
      t.userId !== session.data?.user.id &&
      t.members.every((m) => elements.some((e) => e === m.element)),
  );
  const practiceTeam = saved.find((t) => t.id === practiceId);
  const fighters = practiceTeam
    ? [practiceTeam.member1, practiceTeam.member2, practiceTeam.member3]
        .map((id) => cards.find((c) => c.id === id))
        .filter((c): c is (typeof cards)[number] & { defense: number } => !!c && c.defense !== null)
    : [];
  const opponent = opponents.find((t) => t.id === opponentId)?.members ?? sample;
  return (
    <View style={{ flex: 1 }}>
      <Screen title="対戦" contentStyle={{ paddingTop: 16, gap: 24, paddingBottom: 24 }}>
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" }}>
          {(
            [
              ["teams", "チーム"],
              ["ranking", "ランキング"],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={{
                flex: 1,
                height: 48,
                justifyContent: "center",
                alignItems: "center",
                borderBottomWidth: 2,
                borderBottomColor: tab === key ? "#0284c7" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  fontWeight: "700",
                  color: tab === key ? "#0369a1" : "#64748b",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {tab === "teams" ? (
          <View style={{ gap: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "700", color: "#0f172a" }}>
                マイチーム
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="チームを編成"
                disabled={!ready || saved.length >= 3}
                onPress={() => edit([1, 2, 3].find((n) => !saved.some((t) => t.slot === n))!)}
                style={[battleStyles.action, { opacity: !ready || saved.length >= 3 ? 0.4 : 1 }]}
              >
                <Plus size={16} color="white" />
                <Text style={battleStyles.actionText}>チームを編成</Text>
              </Pressable>
            </View>
            {!ready && (
              <Loading
                error={inventory.error ?? teams.error}
                retry={() => {
                  void inventory.refetch();
                  void teams.refetch();
                }}
              />
            )}
            {ready && !saved.length && (
              <View style={{ paddingVertical: 24, alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "700" }}>最初のチームを作ろう</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569" }}>
                  好きな3枚を選んで、練習対戦で試せます。
                </Text>
              </View>
            )}
            {saved.length === 3 && (
              <Text style={battleStyles.note}>
                3チーム登録済みです。変更は各チームの「編集」から行えます。
              </Text>
            )}
            {saved.map((t) => (
              <View key={t.id} style={{ backgroundColor: "white", borderRadius: 16, padding: 16 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      lineHeight: 24,
                      fontWeight: "700",
                      color: "#0f172a",
                      flex: 1,
                    }}
                  >
                    {t.slot}. {t.name}
                  </Text>
                  <Button
                    title="編集"
                    secondary
                    disabled={!ready}
                    onPress={() => edit(t.slot)}
                    style={battleStyles.secondary}
                    textStyle={battleStyles.secondaryText}
                  />
                </View>
                <View style={{ marginTop: 8 }}>
                  {[t.member1, t.member2, t.member3].map((id, i) => {
                    const c = cards.find((c) => c.id === id);
                    return (
                      <View
                        key={id}
                        style={{
                          paddingVertical: 16,
                          borderTopWidth: i ? 1 : 0,
                          borderTopColor: "#f1f5f9",
                        }}
                      >
                        {c ? (
                          <>
                            <Text
                              style={{
                                fontSize: 12,
                                lineHeight: 16,
                                fontWeight: "600",
                                color: "#64748b",
                                marginBottom: 8,
                              }}
                            >
                              {i + 1}番手
                            </Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <BattleIdentity card={c} />
                              </View>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${c.title}を強化`}
                                disabled={!ready}
                                onPress={() => strengthen(c.id)}
                                style={[
                                  battleStyles.secondary,
                                  {
                                    width: 44,
                                    paddingHorizontal: 0,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  },
                                ]}
                              >
                                <Svg
                                  width={20}
                                  height={20}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="#0f172a"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <Rect x={5} y={2} width={14} height={20} rx={2} />
                                  <Path d="M12 17V7m-4 4 4-4 4 4" />
                                </Svg>
                              </Pressable>
                            </View>
                          </>
                        ) : (
                          <Text>カードを読み込み中…</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTopWidth: 1,
                    borderTopColor: "#f1f5f9",
                    paddingTop: 8,
                  }}
                >
                  <Button
                    title="練習対戦"
                    secondary
                    disabled={!ready}
                    style={battleStyles.secondary}
                    textStyle={battleStyles.secondaryText}
                    onPress={() => {
                      setPracticeId(t.id);
                      setOpponentId("");
                      setPractice(false);
                      setSheet("practice");
                    }}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setRemoveSlot(t.slot)}
                    style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                      チームを解除
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="所持カードを強化"
              disabled={!ready || !cards.length}
              onPress={() => strengthen()}
              style={[
                battleStyles.secondary,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: !ready || !cards.length ? 0.4 : 1,
                },
              ]}
            >
              <Sparkles size={16} color="#0f172a" />
              <Text style={battleStyles.secondaryText}>所持カードを強化</Text>
            </Pressable>
            <Text style={battleStyles.note}>
              編成中のカードは出品・強化素材に使えません。同じ1枚を複数チームに使えます。
            </Text>
            {ready && cards.filter((c) => c.defense !== null).length < 3 && (
              <View>
                <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569" }}>
                  編成には能力値を計測済みのカードが3枚必要です。
                </Text>
                <Pressable onPress={() => router.push("/packs")}>
                  <Text style={{ paddingVertical: 12, fontSize: 14, color: "#0369a1" }}>
                    パックでカードを集める →
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 18, lineHeight: 28, fontWeight: "700", color: "#0f172a" }}>
              日次ランキング
            </Text>
            <View>
              <Text style={{ fontSize: 14, lineHeight: 20, color: "#0f172a" }}>
                対戦日（日本時間）
              </Text>
              <TextInput
                accessibilityLabel="対戦日"
                value={date || ranking.data?.date || ""}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                style={{
                  minHeight: 44,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  borderRadius: 12,
                  backgroundColor: "white",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 14,
                  color: "#0f172a",
                }}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Button
                title="最新の結果"
                secondary
                style={battleStyles.secondary}
                textStyle={battleStyles.secondaryText}
                onPress={() => setDate("")}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: mine }}
                onPress={() => setMine(!mine)}
                style={{ flexDirection: "row", minHeight: 44, alignItems: "center", gap: 8 }}
              >
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderWidth: 1,
                    borderColor: mine ? "#0284c7" : "#94a3b8",
                    borderRadius: 2,
                    backgroundColor: mine ? "#0284c7" : "white",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {mine && <Check size={12} color="white" />}
                </View>
                <Text style={{ fontSize: 14, lineHeight: 20, color: "#0f172a" }}>
                  自分のチームだけ
                </Text>
              </Pressable>
            </View>
            {ranking.isPending || ranking.isError ? (
              <Loading error={ranking.error} retry={ranking.refetch} />
            ) : !ranking.data?.ranking.length ? (
              <Text
                style={{
                  paddingVertical: 24,
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 20,
                  color: "#64748b",
                }}
              >
                {date
                  ? "この日の対戦記録はありません。別の日付か最新の結果を選んでください。"
                  : "まだ対戦記録がありません。次回の開催後に確認してください。"}
              </Text>
            ) : (
              <View>
                {ranking.data.ranking
                  .filter((t) => !mine || t.userId === session.data?.user.id)
                  .map((t, i) => (
                    <Pressable
                      key={t.id}
                      accessibilityRole="link"
                      onPress={() => router.push(`/battle/${ranking.data!.date}/${t.id}`)}
                      style={{
                        minHeight: 64,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 16,
                        paddingHorizontal: 12,
                        paddingVertical: 16,
                        borderTopWidth: i ? 1 : 0,
                        borderTopColor: "#e2e8f0",
                        borderLeftWidth: t.userId === session.data?.user.id ? 2 : 0,
                        borderLeftColor: "#0284c7",
                      }}
                    >
                      <Text
                        style={{
                          minWidth: 32,
                          textAlign: "center",
                          fontSize: 20,
                          lineHeight: 28,
                          fontWeight: "900",
                          color: "#0369a1",
                        }}
                      >
                        {t.rank}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 16,
                          lineHeight: 24,
                          fontWeight: "700",
                          color: "#0f172a",
                        }}
                      >
                        {t.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          lineHeight: 24,
                          fontWeight: "600",
                          color: "#0369a1",
                        }}
                      >
                        {t.points}点
                      </Text>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>
        )}
        <BattleSheet
          visible={sheet === "team"}
          title={saved.some((t) => t.slot === slot) ? "チームを編集" : "チームを編成"}
          onClose={close}
          top={
            !discard && (
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f1f5f9",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    lineHeight: 16,
                    fontWeight: "600",
                    color: "#0369a1",
                    marginBottom: 8,
                  }}
                >
                  {members.length} / 3枚 選択中
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {[0, 1, 2].map((i) => {
                    const c = cards.find((c) => c.id === members[i]);
                    return (
                      <View key={i} style={{ width: pickerWidth, minWidth: 0 }}>
                        {c ? (
                          <>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${c.title}を選択から外す`}
                              style={{ marginBottom: 6 }}
                              onPress={() => setMembers(toggleTeamMember(members, c.id))}
                            >
                              <BattleArtwork card={c} fontSize={20}>
                                <View
                                  style={{
                                    position: "absolute",
                                    left: 4,
                                    top: 4,
                                    borderRadius: 4,
                                    backgroundColor: "rgba(15,23,42,.75)",
                                    paddingHorizontal: 6,
                                  }}
                                >
                                  <Text style={{ fontSize: 12, lineHeight: 16, color: "white" }}>
                                    {i + 1}
                                  </Text>
                                </View>
                                <View
                                  style={{
                                    position: "absolute",
                                    right: 4,
                                    top: 4,
                                    borderRadius: 99,
                                    backgroundColor: "white",
                                    padding: 2,
                                  }}
                                >
                                  <X size={14} color="#0f172a" />
                                </View>
                              </BattleArtwork>
                              <Text
                                numberOfLines={1}
                                style={{
                                  marginTop: 4,
                                  fontSize: 12,
                                  lineHeight: 16,
                                  fontWeight: "600",
                                  color: "#0f172a",
                                }}
                              >
                                {c.title}
                              </Text>
                            </Pressable>
                            <View style={{ flexDirection: "row" }}>
                              {([-1, 1] as const).map((d) => (
                                <Pressable
                                  key={d}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${c.title}を${d < 0 ? "左" : "右"}へ移動`}
                                  disabled={d < 0 ? i === 0 : i === members.length - 1}
                                  onPress={() => setMembers(moveTeamMember(members, i, d))}
                                  style={{
                                    flex: 1,
                                    height: 36,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: (d < 0 ? i === 0 : i === members.length - 1) ? 0.2 : 1,
                                  }}
                                >
                                  {d < 0 ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
                                </Pressable>
                              ))}
                            </View>
                          </>
                        ) : (
                          <View
                            style={{
                              aspectRatio: 1,
                              borderWidth: 1,
                              borderStyle: "dashed",
                              borderColor: "#e2e8f0",
                              borderRadius: 8,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ fontSize: 14, color: "#94a3b8" }}>{i + 1}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )
          }
          footer={
            !discard && (
              <Button
                title={
                  action.pending
                    ? "保存中…"
                    : saved.some((t) => t.slot === slot)
                      ? "変更を保存"
                      : "チームを作成して参加"
                }
                style={battleStyles.action}
                textStyle={battleStyles.actionText}
                disabled={members.length !== 3 || !name.trim() || action.pending}
                onPress={() =>
                  void action.run(
                    () => save.mutateAsync({ slot, name: name.trim(), members }),
                    () => setSheet(null),
                  )
                }
              />
            )
          }
        >
          {discard ? (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 16, lineHeight: 24, color: "#0f172a" }}>
                保存していない変更があります。変更を破棄して閉じますか？
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button
                  title="編集を続ける"
                  secondary
                  style={battleStyles.secondary}
                  textStyle={battleStyles.secondaryText}
                  onPress={() => setDiscard(false)}
                />
                <Button
                  title="変更を破棄"
                  style={battleStyles.action}
                  textStyle={battleStyles.actionText}
                  onPress={() => {
                    setDiscard(false);
                    setSheet(null);
                  }}
                />
              </View>
            </View>
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#0f172a" }}>
                  チーム名
                </Text>
                <TextInput
                  accessibilityLabel="チーム名"
                  maxLength={30}
                  value={name}
                  onChangeText={setName}
                  style={{
                    minHeight: 44,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 14,
                    fontWeight: "600",
                    lineHeight: 20,
                    color: "#0f172a",
                  }}
                />
              </View>
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 12, lineHeight: 16, color: "#475569" }}>
                  {members.length === 3
                    ? "3枚選択済み。入れ替えるときは選択したカードを押して外してください。"
                    : "カードを押して3枚選んでください。選んだ順に対戦します。"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  {cards
                    .filter((c) => c.defense !== null)
                    .map((c) => (
                      <View key={c.id} style={{ width: pickerWidth }}>
                        <BattleCardOption
                          card={c}
                          selected={members.includes(c.id)}
                          selectionLabel={`${members.indexOf(c.id) + 1}番目に選択`}
                          disabled={members.length === 3 && !members.includes(c.id)}
                          onSelect={() => setMembers(toggleTeamMember(members, c.id))}
                        />
                      </View>
                    ))}
                </View>
              </View>
              {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
            </>
          )}
        </BattleSheet>
        <BattleSheet
          visible={sheet === "fusion"}
          title={confirm ? "強化内容を確認" : "カードを強化"}
          onClose={() => {
            if (action.pending) return;
            if (confirm) setConfirm(false);
            else close();
          }}
          footer={
            base && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                {confirm && (
                  <Button
                    title="素材を選び直す"
                    secondary
                    style={battleStyles.secondary}
                    textStyle={battleStyles.secondaryText}
                    disabled={action.pending}
                    onPress={() => setConfirm(false)}
                  />
                )}
                <Button
                  title={
                    action.pending
                      ? "強化中…"
                      : confirm
                        ? `${materialIds.length}枚を消費して強化`
                        : `選択した${materialIds.length}枚を確認`
                  }
                  style={[battleStyles.action, { flex: 1 }]}
                  textStyle={battleStyles.actionText}
                  disabled={!materialIds.length || action.pending || !ready}
                  onPress={() => {
                    if (!confirm) {
                      setConfirm(true);
                      return;
                    }
                    void action.run(
                      async () => {
                        const r = await fuse.mutateAsync({ baseId, materialIds });
                        setFusionResult(r);
                      },
                      () => {
                        setMaterialIds([]);
                        setConfirm(false);
                      },
                    );
                  }}
                />
              </View>
            )
          }
        >
          {!!action.error && (
            <Text accessibilityRole="alert" style={{ fontSize: 14, color: "#b91c1c" }}>
              {action.error}
            </Text>
          )}
          {fusionResult && (
            <View style={{ backgroundColor: "#f0f9ff", borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: "#0c4a6e" }}>
                {fusionResult.materialCount}枚を素材にして強化しました。
              </Text>
              <View
                style={{ flexDirection: "row", gap: 4, alignItems: "center", flexWrap: "wrap" }}
              >
                <Swords size={14} color="#ea580c" />
                <Text style={{ fontSize: 14, lineHeight: 20, color: "#0c4a6e" }}>
                  +{fusionResult.attackGain.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
                </Text>
                <Shield size={14} color="#0284c7" />
                <Text style={{ fontSize: 14, lineHeight: 20, color: "#0c4a6e" }}>
                  +{fusionResult.defenseGain.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
                </Text>
              </View>
              <Text style={{ fontSize: 14, lineHeight: 20, color: "#0c4a6e" }}>
                。次回の対戦から反映されます。
              </Text>
            </View>
          )}
          {base ? (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "700", color: "#0f172a" }}>
                強化するカード
              </Text>
              <BattleIdentity card={base} linkToDetail={false} />
              {!confirm && (
                <Button
                  title="強化するカードを変更"
                  secondary
                  style={[battleStyles.secondary, { alignSelf: "flex-start" }]}
                  textStyle={battleStyles.secondaryText}
                  onPress={() => {
                    setBaseId("");
                    setMaterialIds([]);
                    setFusionResult(null);
                  }}
                />
              )}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "700", color: "#0f172a" }}>
                  強化するカードを選ぶ
                </Text>
                <Text style={{ fontSize: 12, lineHeight: 16, color: "#64748b" }}>
                  {cards.filter((c) => c.defense !== null).length}枚
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {cards
                  .filter((c) => c.defense !== null)
                  .map((c) => (
                    <View key={c.id} style={{ width: pickerWidth }}>
                      <BattleCardOption
                        card={c}
                        selected={false}
                        onSelect={() => {
                          setBaseId(c.id);
                          setMaterialIds([]);
                          setFusionResult(null);
                        }}
                      />
                    </View>
                  ))}
              </View>
              {!cards.some((c) => c.defense !== null) && (
                <Text
                  style={{ fontSize: 14, lineHeight: 22.75, color: "#475569", paddingVertical: 16 }}
                >
                  強化できるカードがありません。能力値を計測済みの所持カードが必要です。
                </Text>
              )}
            </View>
          )}
          {base && !confirm && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "700", color: "#0f172a" }}>
                素材にするカードを選ぶ
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Button
                  title="未強化をまとめて選択"
                  secondary
                  style={battleStyles.secondary}
                  textStyle={battleStyles.secondaryText}
                  disabled={!groups.some((g) => !g.strengthened)}
                  onPress={() => {
                    setMaterialIds(
                      groups
                        .filter((g) => !g.strengthened)
                        .flatMap((g) => g.available.map((c) => c.id))
                        .slice(0, 50),
                    );
                    setFusionResult(null);
                  }}
                />
                <Button
                  title="選択を解除"
                  secondary
                  style={battleStyles.secondary}
                  textStyle={battleStyles.secondaryText}
                  disabled={!materialIds.length}
                  onPress={() => {
                    setMaterialIds([]);
                    setFusionResult(null);
                  }}
                />
              </View>
              <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#075985" }}>
                {materialIds.length}枚 選択中{" "}
                <Text style={{ fontWeight: "400", color: "#64748b" }}>/ 一度に50枚まで</Text>
              </Text>
              {!groups.length && (
                <Text
                  style={{ paddingVertical: 16, fontSize: 14, lineHeight: 20, color: "#475569" }}
                >
                  素材にできるカードがありません。編成中のカードを使う場合は、チームから外してください。
                </Text>
              )}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  columnGap: 12,
                  rowGap: 20,
                  alignItems: "flex-start",
                }}
              >
                {groups.map((g) => {
                  const count = g.available.filter((c) => materialIds.includes(c.id)).length;
                  return (
                    <View key={g.key} style={{ width: pickerWidth }}>
                      <BattleCardOption
                        card={g.card}
                        selected={count > 0}
                        onSelect={() => setMaterialCount(g, count ? 0 : 1)}
                      />
                      <Text
                        style={{ marginTop: 4, fontSize: 10, lineHeight: 16.25, color: "#64748b" }}
                      >
                        所持{g.ownedCount}枚{"\n"}素材に使える{g.available.length}枚
                      </Text>
                      <View
                        style={{
                          marginTop: 8,
                          flexDirection: "row",
                          alignItems: "center",
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                        }}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${g.card.title}の素材を1枚減らす`}
                          disabled={!count}
                          onPress={() => setMaterialCount(g, count - 1)}
                          style={{
                            flex: 1,
                            minHeight: 44,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: count ? 1 : 0.3,
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: "700" }}>−</Text>
                        </Pressable>
                        <TextInput
                          accessibilityLabel={`${g.card.title}の素材枚数`}
                          keyboardType="number-pad"
                          value={String(count)}
                          onChangeText={(v) => setMaterialCount(g, Math.floor(Number(v) || 0))}
                          style={{
                            width: 36,
                            minHeight: 44,
                            textAlign: "center",
                            fontSize: 14,
                            fontWeight: "700",
                            padding: 0,
                          }}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${g.card.title}の素材を1枚増やす`}
                          disabled={count >= g.available.length || materialIds.length >= 50}
                          onPress={() => setMaterialCount(g, count + 1)}
                          style={{
                            flex: 1,
                            minHeight: 44,
                            alignItems: "center",
                            justifyContent: "center",
                            opacity:
                              count >= g.available.length || materialIds.length >= 50 ? 0.3 : 1,
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: "700" }}>＋</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {base && confirm && (
            <View style={{ gap: 16 }}>
              <Text style={{ fontSize: 16, lineHeight: 24, fontWeight: "700", color: "#0f172a" }}>
                消費する素材（合計{materialIds.length}枚）
              </Text>
              {selectedGroups.map((g) => (
                <View
                  key={g.key}
                  style={{ borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 12 }}
                >
                  <BattleIdentity card={g.card} linkToDetail={false} />
                  <Text
                    style={{
                      marginTop: 8,
                      textAlign: "right",
                      fontSize: 14,
                      lineHeight: 20,
                      fontWeight: "700",
                      color: "#0f172a",
                    }}
                  >
                    {g.count}枚を消費
                  </Text>
                </View>
              ))}
              <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#b91c1c" }}>
                選択した{materialIds.length}枚の素材カードはなくなり、元に戻せません。
              </Text>
            </View>
          )}
        </BattleSheet>
        <BattleSheet
          visible={sheet === "practice"}
          title={`${practiceTeam?.name ?? "チーム"}で練習`}
          onClose={close}
        >
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#475569" }}>
            保存済みのチームで試します。カード・ptの消費やランキングへの反映はありません。
          </Text>
          <View>
            <Text style={{ fontSize: 14, lineHeight: 20, color: "#0f172a" }}>練習相手</Text>
            <Select
              label="練習相手"
              value={opponentId}
              options={[
                { value: "", label: "練習用のサンプルチーム" },
                ...opponents.map((t) => ({
                  value: t.id,
                  label: `${t.player} / ${t.name}（${latest.data?.date}時点）`,
                })),
              ]}
              onChange={(id) => {
                setOpponentId(id);
                setPractice(false);
              }}
              style={{ minHeight: 44, paddingHorizontal: 12, paddingVertical: 8 }}
            />
          </View>
          <Button
            title="このチームで試す"
            style={[battleStyles.action, { alignSelf: "flex-start" }]}
            textStyle={battleStyles.actionText}
            disabled={fighters.length !== 3}
            onPress={() => setPractice(true)}
          />
          {practice && fighters.length === 3 && <Match left={fighters} right={opponent} />}
        </BattleSheet>
        <BattleSheet visible={sheet === "help"} title="対戦のルールと遊び方" onClose={close}>
          <BattleHelpContent />
        </BattleSheet>
        {removeSlot !== null && (
          <Confirm
            title="チームを解除します"
            pending={action.pending}
            onCancel={() => setRemoveSlot(null)}
            onConfirm={() =>
              void action.run(
                () => remove.mutateAsync({ slot: removeSlot }),
                () => setRemoveSlot(null),
              )
            }
          >
            <Text>カードは失われません。</Text>
            {!!action.error && <Text accessibilityRole="alert">{action.error}</Text>}
          </Confirm>
        )}
      </Screen>
      <SafeAreaView
        pointerEvents="box-none"
        edges={{ bottom: Platform.OS === "ios" }}
        style={{ position: "absolute", bottom: 0, right: 0 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="対戦のルールと遊び方"
          onPress={() => setSheet("help")}
          style={{
            marginRight: 16,
            marginBottom: 12,
            width: 44,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            backgroundColor: "white",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 6px -1px #0000001a",
          }}
        >
          <CircleHelp size={22} color="#64748b" />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const battleStyles = StyleSheet.create({
  action: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionText: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: "white" },
  secondary: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  secondaryText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#0f172a" },
  note: { fontSize: 12, lineHeight: 19.5, color: "#64748b" },
});
function BattleIdentity({
  card,
  linkToDetail = true,
}: {
  linkToDetail?: boolean;
  card: {
    cardId: string;
    title: string;
    imageUrl: string | null;
    element: Fighter["element"];
    attack: number;
    defense: number | null;
    attackBonus: number;
    defenseBonus: number;
  };
}) {
  const [failed, setFailed] = useState(false);
  const open = linkToDetail ? () => router.push(`/cards/${card.cardId}`) : undefined;
  return (
    <View style={{ flexDirection: "row", gap: 12, minWidth: 0 }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${card.title}の詳細を見る`}
        onPress={open}
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#f0f9ff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {card.imageUrl && !failed ? (
          <Image
            source={{ uri: new URL(cardImageDisplayUrl(card.imageUrl), apiUrl).href }}
            onError={() => setFailed(true)}
            style={{ width: 56, height: 56 }}
          />
        ) : (
          <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: "700", color: "#0369a1" }}>
            {card.title.slice(0, 1)}
          </Text>
        )}
      </Pressable>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <ElementBadge element={card.element} />
          <Pressable onPress={open} style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#0f172a" }}>
              {card.title}
            </Text>
          </Pressable>
        </View>
        <View style={{ height: 18 }}>
          <Stats attack={card.attack} defense={card.defense} />
        </View>
        {(card.attackBonus > 0 || card.defenseBonus > 0) && (
          <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: "#0369a1" }}>
            強化済み：攻 +{card.attackBonus.toLocaleString("ja-JP", { maximumFractionDigits: 2 })} /
            防 +{card.defenseBonus.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}
          </Text>
        )}
      </View>
    </View>
  );
}
