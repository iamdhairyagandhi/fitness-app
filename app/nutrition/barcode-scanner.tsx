import { toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { lookupBarcode } from '@/lib/foodApi';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { FoodItem, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BarcodeScannerScreen() {
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ meal?: string }>();
    const mealType = (params.meal as MealType) || 'snack';
    const { logFood } = useNutritionStore();

    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<FoodItem | null>(null);
    const [manualCode, setManualCode] = useState('');

    const handleBarCodeScanned = async (barcode: string) => {
        if (scanned || loading) return;
        setScanned(true);
        setLoading(true);

        try {
            const food = await lookupBarcode(barcode);
            if (food) {
                setResult(food);
            } else {
                toast.warning('Not Found', `No nutrition data for barcode ${barcode}. Try searching manually.`);
                setScanned(false);
            }
        } catch {
            toast.error('Lookup Failed', 'Could not look up barcode. Check your connection.');
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const handleLogFood = () => {
        if (!result) return;
        logFood(result, 1, mealType);
        toast.success('Logged!', `${result.name} added to ${mealType}`);
        router.back();
    };

    // If we have a result, show it
    if (result) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => { setResult(null); setScanned(false); }}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Scanned Food</Text>
                    <View style={{ width: 24 }} />
                </View>
                <ScrollView contentContainerStyle={styles.resultContainer}>
                    {result.image_url && (
                        <View style={styles.resultImagePlaceholder}>
                            <Ionicons name="nutrition" size={60} color={Colors.primary} />
                        </View>
                    )}
                    <Text style={styles.resultName}>{result.name}</Text>
                    {result.brand && <Text style={styles.resultBrand}>{result.brand}</Text>}
                    <Text style={styles.resultServing}>
                        Serving: {result.serving_size_g}g
                    </Text>

                    <View style={styles.macroGrid}>
                        <View style={[styles.macroBox, { borderColor: Colors.calories }]}>
                            <Text style={[styles.macroValue, { color: Colors.calories }]}>{result.calories}</Text>
                            <Text style={styles.macroLabel}>kcal</Text>
                        </View>
                        <View style={[styles.macroBox, { borderColor: Colors.protein }]}>
                            <Text style={[styles.macroValue, { color: Colors.protein }]}>{result.protein_g}g</Text>
                            <Text style={styles.macroLabel}>Protein</Text>
                        </View>
                        <View style={[styles.macroBox, { borderColor: Colors.carbs }]}>
                            <Text style={[styles.macroValue, { color: Colors.carbs }]}>{result.carbs_g}g</Text>
                            <Text style={styles.macroLabel}>Carbs</Text>
                        </View>
                        <View style={[styles.macroBox, { borderColor: Colors.fat }]}>
                            <Text style={[styles.macroValue, { color: Colors.fat }]}>{result.fat_g}g</Text>
                            <Text style={styles.macroLabel}>Fat</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.logButton} onPress={handleLogFood}>
                        <Ionicons name="add-circle" size={22} color="#fff" />
                        <Text style={styles.logButtonText}>Log to {mealType}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.scanAgainBtn} onPress={() => { setResult(null); setScanned(false); }}>
                        <Text style={styles.scanAgainText}>Scan Another</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

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
                {Platform.OS === 'web' || !permission?.granted ? (
                    <View style={styles.placeholder}>
                        <Ionicons name="barcode-outline" size={80} color={Colors.textTertiary} />
                        {Platform.OS === 'web' ? (
                            <>
                                <Text style={styles.placeholderText}>
                                    Barcode scanning is available on mobile devices
                                </Text>
                                <Text style={styles.placeholderSubtext}>
                                    Use the manual entry below or scan on your phone
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.placeholderText}>Camera permission required</Text>
                                <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
                                    <Text style={styles.permBtnText}>Grant Permission</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : (
                    <>
                        <CameraView
                            style={StyleSheet.absoluteFillObject}
                            facing="back"
                            barcodeScannerSettings={{
                                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                            }}
                            onBarcodeScanned={scanned ? undefined : ({ data }) => handleBarCodeScanned(data)}
                        />
                        <View style={styles.scanOverlay}>
                            <View style={styles.scanFrame}>
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />
                            </View>
                            <Text style={styles.scanHint}>
                                {loading ? 'Looking up product...' : 'Point at barcode'}
                            </Text>
                        </View>
                        {loading && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                            </View>
                        )}
                    </>
                )}
            </View>

            {/* Manual barcode entry + actions */}
            <View style={styles.bottomSection}>
                <View style={styles.manualEntry}>
                    <TextInput
                        style={styles.manualInput}
                        placeholder="Or enter barcode manually..."
                        placeholderTextColor={Colors.textTertiary}
                        value={manualCode}
                        onChangeText={setManualCode}
                        keyboardType="number-pad"
                    />
                    <TouchableOpacity
                        style={[styles.lookupBtn, !manualCode && styles.lookupBtnDisabled]}
                        onPress={() => manualCode && handleBarCodeScanned(manualCode)}
                        disabled={!manualCode || loading}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.lookupBtnText}>Look Up</Text>
                        )}
                    </TouchableOpacity>
                </View>

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
    },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.lg },
    placeholderText: {
        color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold, textAlign: 'center',
    },
    placeholderSubtext: {
        color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20,
    },
    permBtn: {
        backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    permBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.md },
    scanOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center',
    },
    scanFrame: { width: 250, height: 160, position: 'relative' },
    corner: {
        position: 'absolute', width: 30, height: 30,
        borderColor: Colors.primary, borderWidth: 3,
    },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
    scanHint: {
        color: '#fff', fontSize: FontSize.sm, fontWeight: FontWeight.semibold,
        marginTop: Spacing.lg, textShadowColor: '#000', textShadowRadius: 4,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
    },
    bottomSection: {
        paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md,
    },
    manualEntry: {
        flexDirection: 'row', gap: Spacing.sm,
    },
    manualInput: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
        color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
    },
    lookupBtn: {
        backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.xl, justifyContent: 'center',
    },
    lookupBtnDisabled: { opacity: 0.5 },
    lookupBtnText: { color: '#fff', fontWeight: FontWeight.bold, fontSize: FontSize.md },
    manualBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        paddingVertical: Spacing.md,
    },
    manualBtnText: { color: Colors.textSecondary, fontSize: FontSize.md },

    // Result screen
    resultContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center' },
    resultImagePlaceholder: {
        width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.surface,
        alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg,
    },
    resultName: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
    resultBrand: { color: Colors.textSecondary, fontSize: FontSize.md, marginTop: Spacing.xs },
    resultServing: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: Spacing.xs, marginBottom: Spacing.xl },
    macroGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl,
    },
    macroBox: {
        width: '46%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, alignItems: 'center', borderWidth: 1,
    },
    macroValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
    macroLabel: { color: Colors.textTertiary, fontSize: FontSize.sm, marginTop: Spacing.xs },
    logButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
        paddingVertical: Spacing.lg, width: '100%',
    },
    logButtonText: { color: '#fff', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scanAgainBtn: { paddingVertical: Spacing.lg },
    scanAgainText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
});
