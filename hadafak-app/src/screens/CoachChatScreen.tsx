import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  FlatList,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft, Bot, Send } from 'lucide-react-native';
import { ThemeColors } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeContext';
import { api } from '../services/api';

type CoachMessage = { id: string; role: 'user' | 'coach'; text: string };

const SUGGESTIONS = [
  'How should I train this week?',
  'What should I eat today?',
  "I'm feeling low energy",
  'Help me stay motivated',
];

export const CoachChatScreen: React.FC = () => {
  const COLORS = useThemeColors();
  const styles = getStyles(COLORS);
  const navigation = useNavigation<any>();

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<CoachMessage>>(null);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => {
    if (messages.length > 0 || sending) scrollToEnd();
  }, [messages, sending, scrollToEnd]);

  // Animated typing dots
  useEffect(() => {
    if (!sending) return;
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600 - delay),
        ]),
      );
    const a1 = pulse(dot1, 0);
    const a2 = pulse(dot2, 150);
    const a3 = pulse(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => {
      a1.stop(); a2.stop(); a3.stop();
      dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
    };
  }, [sending, dot1, dot2, dot3]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;
    const userMsg: CoachMessage = { id: `u-${Date.now()}`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();
    setSending(true);
    try {
      const res = await api.post('/coach/chat', { message: text });
      const reply = res.data?.reply || "Sorry, I couldn't respond right now.";
      setMessages((prev) => [...prev, { id: `c-${Date.now()}`, role: 'coach', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `c-${Date.now()}`, role: 'coach', text: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: CoachMessage }) => (
    <View style={[styles.bubbleWrap, item.role === 'user' ? styles.bubbleWrapUser : styles.bubbleWrapCoach]}>
      {item.role === 'coach' && (
        <View style={styles.coachAvatar}>
          <Bot size={14} color={COLORS.primary} />
        </View>
      )}
      <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={item.role === 'user' ? styles.bubbleUserText : styles.bubbleCoachText}>{item.text}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Bot size={30} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>Your personal coach</Text>
      <Text style={styles.emptyText}>
        Ask me about training, nutrition, recovery, or anything fitness-related.
      </Text>
      <View style={styles.suggestionsRow}>
        {SUGGESTIONS.map((s) => (
          <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => handleSend(s)} activeOpacity={0.8}>
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerIconBadge}>
          <Bot size={16} color="#FFFFFF" />
        </View>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>AI Coach</Text>
          <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.flex}
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            sending ? (
              <View style={[styles.bubbleWrap, styles.bubbleWrapCoach]}>
                <View style={styles.coachAvatar}>
                  <Bot size={14} color={COLORS.primary} />
                </View>
                <View style={[styles.bubble, styles.bubbleCoach, styles.typingBubble]}>
                  {[dot1, dot2, dot3].map((anim, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          opacity: anim,
                          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message your coach..."
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => handleSend()}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!input.trim() || sending}
            activeOpacity={0.8}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (COLORS: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    flex: {
      flex: 1,
    },
    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: COLORS.border,
    },
    backBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 2,
    },
    headerIconBadge: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    headerTitleWrap: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: COLORS.text,
    },
    headerSubtitle: {
      fontSize: 11,
      fontWeight: '500',
      color: COLORS.textMuted,
      marginTop: 1,
    },
    // List
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      gap: 10,
    },
    listContentEmpty: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    emptyIconWrap: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor: COLORS.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: COLORS.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 13,
      lineHeight: 20,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginBottom: 28,
    },
    suggestionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
    suggestionChip: {
      backgroundColor: COLORS.surfaceLight,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    suggestionText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.primary,
    },
    // Bubbles
    bubbleWrap: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      maxWidth: '100%',
    },
    bubbleWrapUser: {
      justifyContent: 'flex-end',
    },
    bubbleWrapCoach: {
      justifyContent: 'flex-start',
    },
    coachAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: COLORS.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginBottom: 2,
    },
    bubble: {
      maxWidth: '78%',
      borderRadius: 18,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    bubbleUser: {
      backgroundColor: COLORS.primary,
      borderBottomRightRadius: 5,
    },
    bubbleCoach: {
      backgroundColor: COLORS.surfaceLight,
      borderBottomLeftRadius: 5,
    },
    bubbleUserText: {
      fontSize: 15,
      lineHeight: 21,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    bubbleCoachText: {
      fontSize: 15,
      lineHeight: 21,
      color: COLORS.text,
      fontWeight: '500',
    },
    typingBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: COLORS.textMuted,
    },
    // Input
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingTop: 10,
      paddingBottom: 10,
      paddingHorizontal: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.border,
      backgroundColor: COLORS.background,
    },
    input: {
      flex: 1,
      backgroundColor: COLORS.surfaceLight,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      fontSize: 15,
      color: COLORS.text,
      maxHeight: 120,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnDisabled: {
      opacity: 0.35,
    },
  });
