import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Camera } from 'lucide-react-native';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_AREA_SIZE = SCREEN_WIDTH * 0.7;

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onScan,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [laserAnim] = useState(new Animated.Value(0));

  // Reset scanned state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setScanned(false);
      startLaserAnimation();
    }
  }, [visible]);

  const startLaserAnimation = () => {
    laserAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
    onClose();
  };

  const laserTranslateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE - 4],
  });

  if (!visible) return null;

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {!permission ? (
          // Waiting for permissions response
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#FF3A5C" />
            <Text style={styles.loadingText}>Initializing camera...</Text>
          </View>
        ) : !permission.granted ? (
          // Camera permissions not granted
          <View style={styles.permissionContainer}>
            <View style={styles.iconCircle}>
              <Camera size={40} color="#FF3A5C" />
            </View>
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              Hadafak needs access to your camera to scan barcodes and analyze packaged foods.
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Camera active and permission granted
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            >
              {/* Overlay elements */}
              <View style={styles.overlayContainer}>
                {/* Header row */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Scan Barcode</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Reticle Focus Area */}
                <View style={styles.scannerBody}>
                  <View style={styles.scanReticle}>
                    {/* Reticle corner borders */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Animated laser line */}
                    <Animated.View
                      style={[
                        styles.laserLine,
                        { transform: [{ translateY: laserTranslateY }] },
                      ]}
                    />
                  </View>
                  <Text style={styles.scanTip}>
                    Align the barcode within the frame to scan
                  </Text>
                </View>

                {/* Footer status/info */}
                <View style={styles.footer}>
                  <Text style={styles.footerText}>
                    Supports EAN-13, EAN-8, UPC-A, and UPC-E codes
                  </Text>
                </View>
              </View>
            </CameraView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F12',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#A0A0A5',
    fontSize: 15,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0F0F12',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 58, 92, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    color: '#A0A0A5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  permissionButton: {
    backgroundColor: '#FF3A5C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#FF3A5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#A0A0A5',
    fontSize: 15,
  },
  cameraWrapper: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanReticle: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FF3A5C',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 4,
  },
  laserLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: '#FF3A5C',
    shadowColor: '#FF3A5C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
    top: 0,
  },
  scanTip: {
    color: '#E0E0E5',
    fontSize: 14,
    marginTop: 24,
    fontWeight: '500',
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#A0A0A5',
    fontSize: 12,
    textAlign: 'center',
  },
});
