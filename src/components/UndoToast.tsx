import React from 'react';
import { toast } from 'sonner';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  duration?: number;
}

const showUndoToast = ({
  message,
  onUndo,
  duration = 12000
}: UndoToastProps) => {
  return toast.success(message, {
    action: {
      label: 'Undo',
      onClick: onUndo
    },
    duration
  });
};

export default showUndoToast;