import type { PendingAttachment } from '@/types/chat';

type OcrScannerModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (attachment: Omit<PendingAttachment, 'id'>) => void;
  onAppendTranscript: (text: string) => void;
  onError: (message: string) => void;
};

export function OcrScannerModal(_props: OcrScannerModalProps) {
  return null;
}
