import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { Pressable } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text } from "@/components/typography";
import { Loading, Panel, Screen, styles } from "@/components/ui";
import { useTRPC } from "@/lib/client";
import { formatDateTime } from "@/lib/format";
import { errorMessage } from "@/lib/error-message";

export default function Notifications() {
  const t = useTranslation();
  const trpc = useTRPC();
  const cache = useQueryClient();
  const list = trpc.notification.list.queryOptions();
  const query = useQuery(list);
  const [expanded, setExpanded] = useState<string | null>(null);
  const read = useMutation(
    trpc.notification.markRead.mutationOptions({
      onSuccess: (_, { id }) => {
        cache.setQueryData(list.queryKey, (rows) =>
          rows?.map((row) => (row.id === id ? { ...row, isRead: true } : row)),
        );
        void cache.invalidateQueries({ queryKey: trpc.notification.hasUnread.queryKey() });
        setExpanded(id);
      },
    }),
  );

  return (
    <Screen title={t("notifications")} back>
      {!query.data ? (
        <Loading error={query.error} retry={query.refetch} />
      ) : query.data.length === 0 ? (
        <Text style={styles.muted}>{t("noNotifications")}</Text>
      ) : (
        query.data.map((item) => (
          <Panel key={item.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: expanded === item.id }}
              accessibilityLabel={t("notificationState", {
                title: item.title,
                state: item.isRead ? t("read") : t("unread"),
              })}
              disabled={read.isPending}
              onPress={() => {
                read.reset();
                if (item.isRead) setExpanded(expanded === item.id ? null : item.id);
                else read.mutate({ id: item.id });
              }}
            >
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.muted}>
                {formatDateTime(item.createdAt)}　{item.isRead ? t("read") : t("unread")}
              </Text>
            </Pressable>
            {expanded === item.id && <Text>{item.body}</Text>}
          </Panel>
        ))
      )}
      {read.error && <Text accessibilityRole="alert">{errorMessage(read.error)}</Text>}
    </Screen>
  );
}
