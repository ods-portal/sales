'use client';

import { useEffect } from 'react';

const EDITABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(EDITABLE_SELECTOR) !== null;
}

export default function CopyGuard() {
  useEffect(() => {
    const handleClipboard = (e: ClipboardEvent) => {
      if (!isEditableTarget(e.target)) e.preventDefault();
    };
    const handleDragStart = (e: DragEvent) => {
      if (!isEditableTarget(e.target)) e.preventDefault();
    };

    document.addEventListener('copy', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('dragstart', handleDragStart);
    return () => {
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
}
