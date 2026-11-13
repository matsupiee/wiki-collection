import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { Loading } from "../components/ui";
import { auth, queryClient } from "../lib/client";
import { installationSecret } from "../lib/installation";
import { useTranslation } from "../lib/i18n";

let starting: Promise<void> | undefined;
function start() {
  return (starting ??= (async () => {
    const result = await auth.$fetch("/installation/start", {
      method: "POST",
      body: { secret: installationSecret() },
    });
    if (result.error) throw result.error;
    queryClient.clear();
    auth.$store.notify("$sessionSignal");
  })().finally(() => {
    starting = undefined;
  }));
}
export default function Login() {
  const session = auth.useSession();
  const t = useTranslation();
  const [attempt, retry] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (session.isPending || session.data || session.error) return;
    setError(false);
    void start().catch(() => setError(true));
  }, [session.isPending, session.data, session.error, attempt]);
  if (session.data) return <Redirect href="/packs" />;
  return (
    <Loading
      error={session.error || (error ? { message: t("offline") } : null)}
      retry={() => (session.error ? session.refetch() : retry((n) => n + 1))}
    />
  );
}
