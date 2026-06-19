import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { ThemeColors, SHADOWS } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeContext';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export interface AlertButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message: string; // What happened
  why?: string; // Why it happened
  actionGuide?: string; // What the user should do to resolve it
  type?: 'error' | 'success' | 'warning' | 'info';
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const COLORS = useThemeColors();
  const styles = getStyles(COLORS);
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const showAlert = (newOptions: AlertOptions) => {
    setOptions(newOptions);
    setVisible(true);
  };

  const hideAlert = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setOptions(null);
    });
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIcon = () => {
    const type = options?.type || 'info';
    const size = 32;
    switch (type) {
      case 'error':
        return <AlertCircle size={size} color="#DC2626" />;
      case 'success':
        return <CheckCircle2 size={size} color="#16A34A" />;
      case 'warning':
        return <AlertTriangle size={size} color="#D97706" />;
      case 'info':
      default:
        return <Info size={size} color={COLORS.primary} />;
    }
  };

  const getHeaderColor = () => {
    const type = options?.type || 'info';
    switch (type) {
      case 'error':
        return '#FEE2E2';
      case 'success':
        return '#DCFCE7';
      case 'warning':
        return '#FEF3C7';
      case 'info':
      default:
        return COLORS.primaryLight;
    }
  };

  const handleButtonPress = async (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      try {
        await btn.onPress();
      } catch (e) {
        console.warn('Error in custom alert button press:', e);
      }
    }
  };

  const defaultButtons: AlertButton[] = [{ text: 'OK', style: 'default' }];
  const buttonsToRender = options?.buttons && options.buttons.length > 0 ? options.buttons : defaultButtons;

  const isDeleteOrRemove = options?.title?.toLowerCase()?.includes('delete') || 
                           options?.title?.toLowerCase()?.includes('remove') || 
                           options?.message?.toLowerCase()?.includes('delete') || 
                           options?.message?.toLowerCase()?.includes('remove');

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {visible && options && (
        <Modal transparent visible={visible} animationType="none" onRequestClose={hideAlert}>
          <TouchableWithoutFeedback onPress={hideAlert}>
            <View style={styles.overlay}>
              <Animated.View style={[styles.overlayBg, { opacity: fadeAnim }]} />
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.alertBox,
                    isDeleteOrRemove && styles.deleteAlertBox,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                >
                  {/* Decorative Icon Container */}
                  {!isDeleteOrRemove && (
                    <View style={[styles.iconContainer, { backgroundColor: getHeaderColor() }]}>
                      {getIcon()}
                    </View>
                  )}

                  {/* Header Title */}
                  <Text style={[styles.title, isDeleteOrRemove && styles.deleteTitle]}>{options.title}</Text>

                  <ScrollView style={[styles.scrollArea, isDeleteOrRemove && styles.deleteScrollArea]} showsVerticalScrollIndicator={false}>
                    {options.type === 'error' || options.type === 'warning' ? (
                      <View style={styles.errorContainer}>
                        {/* Message (What Happened) */}
                        <Text style={styles.errorText}>{options.message}</Text>

                        {/* Why it Happened */}
                        {options.why && (
                          <Text style={styles.whyText}>{options.why}</Text>
                        )}

                        {/* Clear Action/Guidance */}
                        {options.actionGuide && (
                          <View style={styles.guideSection}>
                            <Text style={styles.guideText}>{options.actionGuide}</Text>
                          </View>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.simpleMessage, isDeleteOrRemove && styles.deleteSimpleMessage]}>{options.message}</Text>
                    )}
                  </ScrollView>

                  {/* Action Buttons */}
                  <View
                    style={[
                      styles.btnContainer,
                      buttonsToRender.length > 2 ? styles.btnContainerVertical : styles.btnContainerHorizontal,
                    ]}
                  >
                    {buttonsToRender.map((btn, index) => {
                      const isDestructive = btn.style === 'destructive';
                      const isCancel = btn.style === 'cancel';
                      
                      let btnBg = COLORS.primary;
                      let textColor = '#FFFFFF';
                      let borderWidth = 0;
                      let borderColor = 'transparent';

                      if (isDestructive) {
                        btnBg = '#DC2626';
                      } else if (isCancel) {
                        btnBg = '#FFFFFF';
                        textColor = COLORS.text;
                        borderWidth = 1.5;
                        borderColor = COLORS.border;
                      }

                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.btn,
                            {
                              backgroundColor: btnBg,
                              borderWidth,
                              borderColor,
                              flex: buttonsToRender.length <= 2 ? 1 : undefined,
                            },
                          ]}
                          onPress={() => handleButtonPress(btn)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.btnText, { color: textColor }]}>{btn.text}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </AlertContext.Provider>
  );
};

const getStyles = (COLORS: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    maxHeight: height * 0.8,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollArea: {
    width: '100%',
    maxHeight: 220,
    marginBottom: 20,
  },
  simpleMessage: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  deleteAlertBox: {
    padding: 16,
    borderRadius: 16,
    maxWidth: 290,
  },
  deleteTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  deleteScrollArea: {
    maxHeight: 50,
    marginBottom: 10,
  },
  deleteSimpleMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textMuted,
  },
  errorContainer: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    fontWeight: '600',
  },
  whyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  guideSection: {
    backgroundColor: COLORS.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  guideText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 18,
  },
  btnContainer: {
    width: '100%',
    gap: 10,
  },
  btnContainerHorizontal: {
    flexDirection: 'row',
  },
  btnContainerVertical: {
    flexDirection: 'column',
  },
  btn: {
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
