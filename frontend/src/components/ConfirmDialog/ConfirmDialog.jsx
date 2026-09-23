import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const ConfirmDialog = ({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  onConfirm,
  open: controlledOpen,
  onOpenChange,
  restoreFocusRef,
}) => {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;

  const handleConfirm = () => {
    setOpen(false);
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent variant="alert" showCloseButton={false} onCloseAutoFocus={restoreFocusRef ? (event) => {
        event.preventDefault();
        restoreFocusRef.current?.focus();
      } : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="lg" className="rounded-full">Cancel</Button>
          </DialogClose>
          <Button variant={confirmVariant} size="lg" className="rounded-full" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
