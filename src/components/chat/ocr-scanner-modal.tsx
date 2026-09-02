import { useEffect, useState, type ComponentType } from 'react';

import type { PendingAttachment } from '@/types/chat';

export type OcrScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (attachment: Omit<PendingAttachment, 'id'>) => void;
  onAppendTranscript: (text: string) => void;
  onError: (message: string) => void;
};

/** Lazy-loads the vision-camera implementation so Expo Go can start without native OCR. */
export function OcrScannerModal(props: OcrScannerModalProps) {
  const [Impl, setImpl] = useState<ComponentType<OcrScannerModalProps> | null>(null);

  useEffect(() => {
    if (!props.visible) {
      setImpl(null);
      return;
    }

    let cancelled = false;
    void import('./ocr-scanner-modal.dev-build')
      .then((module) => {
        if (!cancelled) setImpl(() => module.OcrScannerModal);
      })
      .catch(() => {
        if (!cancelled) {
          props.onError('Scan text requires a development build (not available in Expo Go).');
          props.onClose();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [props.visible, props.onClose, props.onError]);

  if (!props.visible || !Impl) return null;
  return <Impl {...props} />;
}
