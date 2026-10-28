import { toast } from "sonner";

/**
 * Shows a top-right success toast with a 5s Undo button.
 * `onUndo` is called if the user clicks Undo within the window.
 */
export function undoToast(message: string, onUndo: () => void, description?: string) {
  toast.success(message, {
    description,
    duration: 5000,
    action: {
      label: "Desfazer",
      onClick: onUndo,
    },
  });
}
