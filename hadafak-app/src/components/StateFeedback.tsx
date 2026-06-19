import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeContext';
import { AlertCircle, CheckCircle2, Inbox } from 'lucide-react-native';

interface StateFeedbackProps {
  type: 'loading' | 'success' | 'error' | 'empty';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const StateFeedback: React.FC<StateFeedbackProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  icon,
  containerStyle,
}) => {
  const COLORS = useThemeColors();
  const styles = getStyles(COLORS);
  if (type === 'loading') {
    return (
      <View style={[styles.centerContainer, containerStyle]}>
        <View style={styles.loadingWrapper}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{title || 'Loading content...'}</Text>
          {description && <Text style={styles.loadingSubText}>{description}</Text>}
        </View>
      </View>
    );
  }

  if (type === 'success') {
    return (
      <View style={[styles.centerContainer, containerStyle]}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#E6F4EA' }]}>
            {icon || <CheckCircle2 size={36} color="#137333" />}
          </View>
          <Text style={styles.title}>{title || 'Success!'}</Text>
          <Text style={styles.description}>
            {description || 'Action completed successfully.'}
          </Text>
          {actionText && onAction && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={onAction}>
              <Text style={styles.btnText}>{actionText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  if (type === 'error') {
    return (
      <View style={[styles.centerContainer, containerStyle]}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: '#FCE8E6' }]}>
            {icon || <AlertCircle size={36} color="#C5221F" />}
          </View>
          <Text style={styles.title}>{title || 'Something went wrong'}</Text>
          <Text style={styles.description}>
            {description || 'Failed to load data. Please check your connection and try again.'}
          </Text>
          {actionText && onAction && (
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={onAction}>
              <Text style={styles.btnText}>{actionText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Empty State
  return (
    <View style={[styles.centerContainer, containerStyle]}>
      <View style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: COLORS.primaryLight }]}>
          {icon || <Inbox size={36} color={COLORS.primary} />}
        </View>
        <Text style={styles.title}>{title || 'No data found'}</Text>
        <Text style={styles.description}>
          {description || 'There is nothing to display here right now.'}
        </Text>
        {actionText && onAction && (
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.primary }]} onPress={onAction}>
            <Text style={styles.btnText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const getStyles = (COLORS: ThemeColors) => StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'transparent',
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  loadingSubText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  btn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
