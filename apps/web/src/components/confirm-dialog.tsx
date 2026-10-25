import { Button } from "@wiki-collection/ui/components/button";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

// pt を使う操作やカードを手放す操作の前に出す確認ダイアログ
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-center text-lg font-extrabold text-slate-800">{title}</h2>
            <div className="mb-6 text-center text-sm text-slate-600">{children}</div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="h-11 flex-1 rounded-full"
                onClick={onCancel}
                disabled={pending}
              >
                やめる
              </Button>
              <Button
                className="h-11 flex-1 rounded-full bg-sky-500 text-white hover:bg-sky-600"
                onClick={onConfirm}
                disabled={pending}
              >
                {pending ? "処理中…" : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
