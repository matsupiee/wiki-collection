import { errorMessage } from "@/lib/error-message";
import { useState } from "react";
import { queryClient } from "./client";
// 同じ操作の二重送信を防ぎ、成功後に全画面の残高・所持情報を更新する。
import { useRef } from "react";
export function useAction() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const running = useRef(false);
  const run = async (action: () => Promise<unknown>, done?: () => void) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setError("");
    try {
      await action();
      await queryClient.invalidateQueries();
      done?.();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      running.current = false;
      setPending(false);
    }
  };
  return { error, pending, run, clearError: () => setError("") };
}
