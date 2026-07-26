import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

interface ConfirmDeleteDialogProps {
  open: boolean;
  busy: boolean;
  title: string;
  description: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 删除确认对话框:统一 AlertDialog + busy 守卫 + Spinner 样板(见 code-style §7)。
 *
 * busy 时禁用关闭与确认(onOpenChange 守卫 + Cancel/Action disabled),
 * 避免删除进行中误关或重复触发。
 */
export function ConfirmDeleteDialog({ open, busy, title, description, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy)
          onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={busy} onClick={() => { onConfirm(); }}>
            {busy && <Spinner data-icon="inline-start" />}
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
