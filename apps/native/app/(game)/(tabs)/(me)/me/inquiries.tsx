import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Keyboard } from "react-native";
import { Text } from "@/components/typography";
import { Button, Field, Loading, Panel, Screen, styles } from "@/components/ui";
import { useTRPC } from "@/lib/client";
import { errorMessage } from "@/lib/error-message";
import { formatDateTime } from "@/lib/format";
import { useTranslation } from "@/lib/i18n";

function MessageForm({ reply, send }: { reply?: boolean; send: (body: string) => Promise<void> }) {
  const t = useTranslation();
  const [body, setBody] = useState("");
  const mutation = useMutation({
    mutationFn: send,
    onSuccess: () => {
      setBody("");
      Keyboard.dismiss();
    },
  });
  return (
    <Panel>
      <Field
        testID={reply ? "answer-input" : "inquiry-input"}
        label={t(reply ? "answerBody" : "inquiryBody")}
        multiline
        maxLength={2000}
        editable={!mutation.isPending}
        value={body}
        onChangeText={setBody}
      />
      <Button
        title={t(reply ? "sendAnswer" : "sendInquiry")}
        disabled={!body.trim() || mutation.isPending}
        onPress={() => mutation.mutate(body.trim())}
      />
      {mutation.error && <Text accessibilityRole="alert">{errorMessage(mutation.error)}</Text>}
    </Panel>
  );
}

export default function Inquiries() {
  const t = useTranslation();
  const trpc = useTRPC();
  const cache = useQueryClient();
  const [queue, setQueue] = useState(false);
  const mine = useQuery(trpc.inquiry.mine.queryOptions());
  const staffView = !!mine.data?.canAnswer && queue;
  const pending = useQuery(trpc.inquiry.pending.queryOptions(undefined, { enabled: staffView }));
  const submit = useMutation(trpc.inquiry.submit.mutationOptions());
  const answer = useMutation(trpc.inquiry.answer.mutationOptions());
  const query = staffView ? pending : mine;
  const items = staffView ? pending.data : mine.data?.items;
  async function refresh() {
    await cache.invalidateQueries({ queryKey: trpc.inquiry.pathKey() });
  }
  return (
    <Screen title={t("inquiries")} back>
      {mine.data?.canAnswer && (
        <Button
          variant="outline"
          title={t(staffView ? "inquiryHistory" : "unansweredInquiries")}
          onPress={() => setQueue(!queue)}
        />
      )}
      {!staffView && (
        <MessageForm
          send={async (body) => {
            await submit.mutateAsync({ body });
            await refresh();
          }}
        />
      )}
      <Text style={styles.title}>{t(staffView ? "unansweredInquiries" : "inquiryHistory")}</Text>
      <Button variant="link" title={t("refreshInquiries")} onPress={() => void refresh()} />
      {!items || query.error ? (
        <Loading error={query.error} retry={query.refetch} />
      ) : (
        items.map((item) => (
          <Panel key={item.id}>
            <Text style={styles.muted}>
              {formatDateTime(item.createdAt)}　
              {t(item.answer ? "inquiryAnswered" : "awaitingReply")}
            </Text>
            <Text>{item.body}</Text>
            {item.answer && (
              <>
                <Text style={styles.title}>{t("supportReply")}</Text>
                <Text>{item.answer}</Text>
              </>
            )}
            {staffView && (
              <MessageForm
                reply
                send={async (value) => {
                  await answer.mutateAsync({ id: item.id, answer: value });
                  await refresh();
                }}
              />
            )}
          </Panel>
        ))
      )}
      {staffView && items?.length === 0 && <Text>{t("noPendingInquiries")}</Text>}
    </Screen>
  );
}
