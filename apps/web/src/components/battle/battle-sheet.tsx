import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// Native modal dialogs provide focus trapping, background inertness and focus restoration.
export function BattleSheet({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.body.style.overflow;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      dialog.animate(
        [
          { transform: "translateY(32px)", opacity: 0 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        { duration: 180, easing: "ease-out" },
      );
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus();
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(e) => {
        e.stopPropagation();
        e.preventDefault();
        if (!busy) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/45 sm:bottom-4 sm:rounded-3xl"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button
          type="button"
          aria-label="シートを閉じる"
          disabled={busy}
          onClick={onClose}
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-40"
        >
          <X size={20} />
        </button>
      </header>
      <fieldset
        disabled={busy}
        className="min-w-0 space-y-5 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {children}
      </fieldset>
    </dialog>
  );
}
