import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { Navigation } from 'lucide-react-native';

export const MapScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Navigation size={48} color={COLORS.primary} style={styles.icon} />
      <Text style={styles.title}>GPS Run Tracker</Text>
      <Text style={styles.subtitle}>Map and live GPS run logs will display here.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
  },
});
