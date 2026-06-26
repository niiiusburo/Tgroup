/**
 * @crossref:domain[patient-portal]
 * @crossref:used-in[nk-patient-app navigation]
 * @crossref:uses[useChat.ts, src/components/ui, src/constants/theme]
 *
 * Reference custom chat screen for NK Patient Portal.
 * This is a starting point; integrate the exact iPhone.md tokens before shipping.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeftIcon, PaperPlaneRightIcon, UserIcon, RobotIcon } from 'phosphor-react-native';
import { useNavigation } from '@react-navigation/native';
import { useChat } from './useChat';
import { ChatMessage } from './chat-api';
import { LoadingSpinner } from '../components/ui';

const COLORS = {
  primary: '#F97316',
  background: '#FFFFFF',
  foreground: '#1A1A1A',
  muted: '#F2F2F7',
  mutedForeground: '#8E8E93',
  border: '#E5E5EA',
  aiBubble: '#FFF7ED',
};

interface ChatScreenProps {
  route?: { params?: { sessionId?: string } };
}

export default function ChatScreen({ route }: ChatScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { messages, loading, sending, error, sendMessage, escalate } = useChat({
    sessionId: route?.params?.sessionId,
  });
  const [input, setInput] = React.useState('');
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage(text);
  };

  const renderItem: ListRenderItem<ChatMessage> = ({ item }) => {
    const isPatient = item.role === 'patient';
    const isSystem = item.role === 'system';

    if (isSystem) {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isPatient ? styles.rowEnd : styles.rowStart]}>
        {!isPatient && (
          <View style={styles.avatar}>
            <RobotIcon size={16} color={COLORS.primary} weight="fill" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isPatient ? styles.bubblePatient : styles.bubbleAi,
          ]}
        >
          <Text style={[styles.bubbleText, isPatient && { color: '#FFFFFF' }]}>
            {item.content}
          </Text>
        </View>
        {isPatient && (
          <View style={styles.avatar}>
            <UserIcon size={16} color={COLORS.primary} weight="fill" />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top + 44}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <CaretLeftIcon size={24} color={COLORS.foreground} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hỗ trợ qua chat</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <LoadingSpinner />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.escalateButton}
          onPress={() => escalate('patient_requested')}
          disabled={sending}
        >
          <Text style={styles.escalateText}>Gặp nhân viên</Text>
        </TouchableOpacity>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={COLORS.mutedForeground}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <PaperPlaneRightIcon size={20} color="#FFFFFF" weight="fill" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.foreground },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 6 },
  rowStart: { justifyContent: 'flex-start' },
  rowEnd: { justifyContent: 'flex-end' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  bubble: {
    maxWidth: '72%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleAi: { backgroundColor: COLORS.aiBubble },
  bubblePatient: { backgroundColor: COLORS.primary },
  bubbleText: { fontSize: 15, lineHeight: 22, color: COLORS.foreground },
  systemRow: { alignItems: 'center', marginVertical: 8 },
  systemText: { fontSize: 13, color: COLORS.mutedForeground, fontStyle: 'italic' },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  escalateButton: { alignSelf: 'center', marginBottom: 8 },
  escalateText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: COLORS.muted,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.foreground,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { opacity: 0.5 },
  errorBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  errorText: { color: '#FF3B30', fontSize: 13, textAlign: 'center' },
});
