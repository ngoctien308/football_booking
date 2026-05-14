import { useEffect, useId, useRef } from "react";

const ConfirmModal = ({
  open,
  title = "Xác nhận",
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
  loading = false,
  tone = "danger", // "danger" | "primary"
}) => {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onCancel?.();
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") onConfirm?.();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel, onConfirm]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => panelRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const confirmClass =
    tone === "primary"
      ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
      : "bg-rose-600 hover:bg-rose-700 focus:ring-rose-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 focus:outline-none"
      >
        <div className="p-5">
          <h3 id={titleId} className="text-base font-semibold text-slate-900">
            {title}
          </h3>
          {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}
        </div>

        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-3 py-2 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 ${confirmClass}`}
          >
            {loading ? "Đang xử lý..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

