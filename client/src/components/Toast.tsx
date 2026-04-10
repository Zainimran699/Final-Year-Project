import { useEffect } from "react";

// Lightweight toast notification. Fixed to the bottom-right corner.
// Auto-dismisses after 3 seconds. Green for success, red for error.
export default function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  // Auto-dismiss after 3 seconds.
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === "success" ? "bg-green-600" : "bg-red-600";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 ${bgColor} text-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-3 max-w-sm`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="text-white/80 hover:text-white font-bold text-lg leading-none"
        aria-label="Close"
      >
        &times;
      </button>
    </div>
  );
}
