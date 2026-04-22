import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';

export default function BarcodeScannerScreen() {
    const insets = useSafeAreaInsets();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        // In a real implementation, request camera permission
        // For MVP, show a placeholder
        if (Platform.OS === 'web') {
            setHasPermission(false);
        } else {
            setHasPermission(true);
        }
    }, []);

    const handleBarCodeScanned = (barcode: string) => {
        setScanned(true);
        // In production: look up barcode in OpenFoodFacts API or local DB
        Alert.alert(
            'Barcode Scanned',
            `Code: ${barcode}\n\nBarcode lookup requires connecting to a food database API (e.g., OpenFoodFacts). For now, you can manually search for this food.`,
            [
                { text: 'Search Manually', onPress: () => router.replace('/nutrition/food-search') },
                { text: 'Scan Again', onPress: () => setScanned(false) },
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Scan Barcode</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Camera area */}
            <View style={styles.cameraArea}>
                {Platform.OS === 'web' ? (
                    <View style={styles.placeholder}>
                        <Ionicons name="barcode-outline" size={80} color={Colors.textTertiary} />
                        <Text style={styles.placeholderText}>
                            Barcode scanning is available on mobile devices
                        </Text>
                        <Text style={styles.placeholderSubtext}>
                            Uses your phone camera to scan product barcodes and auto-fill nutrition info
                        </Text>
                    </View>
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="scan-outline" size={80} color={Colors.primary} />
                        <Text style={styles.placeholderText}>
                            Point camera at barcode
                        </Text>
                        <View style={styles.scanFrame}>
                            <View style={[styles.corner, styles.cornerTL]} />
                            <View style={[styles.corner, styles.cornerTR]} />
                            <View style={[styles.corner, styles.cornerBL]} />
                            <View style={[styles.corner, styles.cornerBR]} />
                        </View>
                    </View>
                )}
            </View>

            {/* Demo button for testing */}
            <View style={styles.demoSection}>
                <TouchableOpacity
                    style={styles.demoBtn}
                    onPress={() => handleBarCodeScanned('5901234123457')}
                >
                    <Ionicons name="flash-outline" size={20} color={Colors.primary} />
                    <Text style={styles.demoBtnText}>Simulate Scan (Demo)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.manualBtn}
                    onPress={() => router.replace('/nutrition/food-search')}
                >
                    <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
                    <Text style={styles.manualBtnText}>Search Manually Instead</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    cameraArea: {
        flex: 1, margin: Spacing.lg, borderRadius: BorderRadius.xl,
        backgroundColor: Colors.surface, overflow: 'hidden',
        alignItems: 'center', justifyContent: 'center',
    },
    placeholder: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.lg },
    placeholderText: {
        color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold, textAlign: 'center',
    },
    placeholderSubtext: {
        color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20,
    },
    scanFrame: {
        width: 200, height: 200, position: 'relative', marginTop: Spacing.lg,
    },
    corner: {
        position: 'absolute', width: 30, height: 30,
        borderColor: Colors.primary, borderWidth: 3,
    },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
    demoSection: {
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md,
    },
    demoBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.primary,
    },
    demoBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    manualBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    manualBtnText: { color: Colors.textSecondary, fontSize: FontSize.md },
});
