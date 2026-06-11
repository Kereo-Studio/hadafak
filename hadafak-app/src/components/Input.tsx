import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native';
import { COLORS } from '../theme/colors';
import * as Icons from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  iconName?: keyof typeof Icons;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  iconName,
  error,
  secureTextEntry,
  onFocus,
  onBlur,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const IconComponent = iconName ? (Icons[iconName] as React.ComponentType<any>) : null;

  return (
    <View style={styles.container}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        {IconComponent && (
          <IconComponent
            size={20}
            color={error ? COLORS.error : isFocused ? COLORS.primary : COLORS.textMuted}
            style={styles.icon}
          />
        )}
        
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            {isPasswordVisible ? (
              <Icons.EyeOff size={20} color={COLORS.textMuted} />
            ) : (
              <Icons.Eye size={20} color={COLORS.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
    fontWeight: '600',
    paddingLeft: 4,
  },
  inputWrapper: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 24, // highly rounded corners matching Figma
    paddingHorizontal: 16,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    paddingLeft: 8,
  },
});
