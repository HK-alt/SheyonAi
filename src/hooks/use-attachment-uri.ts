import { useEffect, useState } from 'react';

import { getAttachmentSignedUrl } from '@/services/attachments';

function isLocalUri(path: string) {
  return (
    path.startsWith('file://') ||
    path.startsWith('content://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  );
}

export function useAttachmentUri(attachment: { path: string; localUri?: string }) {
  const syncUri =
    attachment.localUri ?? (isLocalUri(attachment.path) ? attachment.path : null);
  const [remoteState, setRemoteState] = useState<{ path: string; uri: string } | null>(null);

  useEffect(() => {
    if (syncUri) return;

    let cancelled = false;
    getAttachmentSignedUrl(attachment.path)
      .then((signed) => {
        if (!cancelled) setRemoteState({ path: attachment.path, uri: signed });
      })
      .catch(() => {
        if (!cancelled) setRemoteState(null);
      });

    return () => {
      cancelled = true;
    };
  }, [attachment.path, syncUri]);

  if (syncUri) return syncUri;
  if (remoteState?.path === attachment.path) return remoteState.uri;
  return null;
}
