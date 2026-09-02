import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { ChatScreen } from '@/components/chat/chat-screen';
import { getSubjectTutorTitle, isSubject } from '@/subject';

export default function SubjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjectId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!subjectId || !isSubject(subjectId)) {
      router.replace('/');
    }
  }, [subjectId, router]);

  if (!subjectId || !isSubject(subjectId)) {
    return null;
  }

  return (
    <ChatScreen
      subject={subjectId}
      headerTitle={getSubjectTutorTitle(subjectId) ?? undefined}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace('/');
      }}
    />
  );
}
