import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CameraScreen, type CameraCapture } from '@/components/camera/camera-screen';
import { ChatScreen } from '@/components/chat/chat-screen';
import { ConversationSidebar } from '@/components/chat/conversation-sidebar';
import { HomeTabBar, type HomeTab } from '@/components/research/home-tab-bar';
import { ResearchScreen } from '@/components/research/research-screen';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import type { HomeworkIntent } from '@/lib/homework-intent';

type CameraDraft = {
  capture: CameraCapture;
  intent: HomeworkIntent;
};

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const persistentSidebar = Platform.OS === 'web' && width >= 900;
  const [activeTab, setActiveTab] = useState<HomeTab>('chat');
  const [researchDraft, setResearchDraft] = useState<string | null>(null);
  const [cameraDraft, setCameraDraft] = useState<CameraDraft | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatChromeVisible, setChatChromeVisible] = useState(true);

  const handleAskAi = useCallback((prompt: string) => {
    setResearchDraft(prompt);
    setActiveTab('chat');
  }, []);

  const handleCameraPhoto = useCallback((capture: CameraCapture, intent: HomeworkIntent) => {
    setCameraDraft({ capture, intent });
    setActiveTab('chat');
  }, []);

  const handleTabChange = useCallback((tab: HomeTab) => {
    setChatChromeVisible(true);
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    try {
      setSidebarCollapsed(window.localStorage.getItem('sheyonai.sidebar.collapsed') === '1');
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('sheyonai.sidebar.collapsed', next ? '1' : '0');
        } catch {
          // Ignore storage errors.
        }
      }
      return next;
    });
  }, []);

  const fullscreenChat = activeTab === 'chat' && !chatChromeVisible;

  return (
    <ThemedView style={[styles.flex, persistentSidebar && styles.desktopRow]}>
      {persistentSidebar ? (
        <ConversationSidebar
          variant="persistent"
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebarCollapsed}
          onActivateConversation={() => setActiveTab('chat')}
        />
      ) : null}
      <View style={styles.mainColumn}>
        <HomeTabBar
          active={activeTab}
          onChange={handleTabChange}
          visible={activeTab !== 'chat' || chatChromeVisible}
        />
        {fullscreenChat ? (
          <View style={{ height: insets.top, backgroundColor: theme.background }} />
        ) : null}
        {activeTab === 'chat' ? (
          <ChatScreen
            nestedHeader
            hidePersistentSidebar={persistentSidebar}
            seedText={researchDraft}
            onSeedTextConsumed={() => setResearchDraft(null)}
            seedAttachment={cameraDraft?.capture ?? null}
            seedHomeworkIntent={cameraDraft?.intent ?? null}
            onSeedAttachmentConsumed={() => setCameraDraft(null)}
            onOpenResearch={() => setActiveTab('research')}
            onChromeVisibilityChange={setChatChromeVisible}
          />
        ) : activeTab === 'camera' ? (
          <CameraScreen onUsePhoto={handleCameraPhoto} />
        ) : (
          <ResearchScreen onAskAi={handleAskAi} />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  desktopRow: {
    flexDirection: 'row',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
});
