/**
 * Receipt / Menu Scanner — Phase C #19
 *
 * Camera → GPT-4o Vision → parse receipt/menu items → present for logging
 */

import { Button, toast } from '@/components/ui';
import { AI_PROXY_ENABLED } from '@/constants/config';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { parseReceiptImage } from '@/lib/nutritionIntelligence';
import { imageOnlyPickerOptions, requestCameraAccess, requestPhotoLibraryAccess } from '@/lib/imagePickerPermissions';
import { generateId } from '@/lib/utils';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { MealType, ReceiptScanResult } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReceiptScannerScreen() {
    const insets = useSafeAreaInsets();
    const { logFood } = useNutritionStore();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState<ReceiptScanResult | null>(null);
    const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

    const pickImage = async (useCamera: boolean) => {
        const source = useCamera ? 'camera' : 'gallery';

        try {
            const options: ImagePicker.ImagePickerOptions = {
                ...imageOnlyPickerOptions,
                quality: 0.7,
                base64: true,
                allowsEditing: false,
            };

            let pickerResult;
            if (useCamera) {
                const permitted = await requestCameraAccess();
                if (!permitted) return;
                pickerResult = await ImagePicker.launchCameraAsync(options);
            } else {
                const permitted = await requestPhotoLibraryAccess();
                if (!permitted) return;
                pickerResult = await ImagePicker.launchImageLibraryAsync(options);
            }

            if (pickerResult.canceled || !pickerResult.assets?.[0]) return;

            const asset = pickerResult.assets[0];
            setImageUri(asset.uri);
            setResult(null);
            setIsScanning(true);

            if (AI_PROXY_ENABLED && asset.base64) {
                const parsed = await parseReceiptImage(asset.base64);
                setResult(parsed);
                setSelectedItems(new Set(parsed.items.map((_, i) => i)));
            } else {
                toast.warning(
                    'Scan unavailable',
                    AI_PROXY_ENABLED
                        ? 'Image data was unavailable. Retake the receipt and try again.'
                        : 'Live receipt scanning is unavailable. Add items manually from food search.',
                );
            }
        } catch (error) {
            console.warn('[ReceiptScanner] Failed to pick or scan receipt image:', { source, error });
            toast.error(
                'Scan Failed',
                source === 'camera'
                    ? 'Could not scan from the camera. Try again or choose a photo from your gallery.'
                    : 'Could not scan that photo. Try another image or retake the receipt.',
            );
        } finally {
            setIsScanning(false);
        }
    };

    const toggleItem = (index: number) => {
        setSelectedItems((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    };

    const handleLogSelected = () => {
        if (!result) return;

        let count = 0;
        for (const idx of selectedItems) {
            const item = result.items[idx];
            if (!item) continue;

            logFood(
                {
                    id: generateId(),
                    name: item.name,
                    brand: result.storeName || 'Receipt Scan',
                    barcode: null,
                    serving_size_g: 0,
                    serving_unit: 'serving',
                    calories: item.calories,
                    protein_g: item.protein_g,
                    carbs_g: item.carbs_g,
                    fat_g: item.fat_g,
                    fiber_g: null,
                    sugar_g: null,
                    sodium_mg: null,
                    is_custom: false,
                    user_id: null,
                    image_url: null,
                },
                item.quantity,
                selectedMeal,
            );
            count++;
        }

        if (count > 0) {
            toast.success('Logged!', `${count} item${count > 1 ? 's' : ''} from receipt added`);
            router.back();
        }
    };

    const totalCals = result
        ? result.items.filter((_, i) => selectedItems.has(i)).reduce((s, f) => s + f.calories * f.quantity, 0)
        : 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Receipt Scanner</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Camera Buttons */}
                {!imageUri && (
                    <View style={styles.cameraSection}>
                        <Ionicons name="receipt-outline" size={64} color={Colors.textTertiary} />
                        <Text style={styles.cameraHint}>
                            Scan a receipt or restaurant menu to auto-detect food items with estimated nutrition
                        </Text>
                        <View style={styles.cameraButtons}>
                            <TouchableOpacity style={styles.cameraBtn} onPress={() => pickImage(true)}>
                                <Ionicons name="camera" size={24} color={Colors.text} />
                                <Text style={styles.cameraBtnText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cameraBtn} onPress={() => pickImage(false)}>
                                <Ionicons name="images" size={24} color={Colors.text} />
                                <Text style={styles.cameraBtnText}>Gallery</Text>
                            </TouchableOpacity>
                        </View>
                        {!AI_PROXY_ENABLED && (
                            <Button title="Search Foods Manually" variant="outline" onPress={() => router.replace('/nutrition/food-search')} />
                        )}
                    </View>
                )}

                {/* Image Preview */}
                {imageUri && (
                    <View style={styles.imagePreview}>
                        <Image source={{ uri: imageUri }} style={styles.receiptImage} resizeMode="contain" />
                        <TouchableOpacity style={styles.retakeBtn} onPress={() => { setImageUri(null); setResult(null); }}>
                            <Ionicons name="refresh" size={16} color={Colors.text} />
                            <Text style={styles.retakeText}>Retake</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isScanning && (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={Colors.primary} />
                        <Text style={styles.loadingText}>Analyzing receipt...</Text>
                    </View>
                )}

                {/* Results */}
                {result && (
                    <View style={styles.resultSection}>
                        {result.storeName && (
                            <View style={styles.storeRow}>
                                <Ionicons name="storefront-outline" size={18} color={Colors.secondary} />
                                <Text style={styles.storeName}>{result.storeName}</Text>
                                {result.totalPrice != null && (
                                    <Text style={styles.storePrice}>${result.totalPrice.toFixed(2)}</Text>
                                )}
                            </View>
                        )}

                        {/* Meal Selector */}
                        <View style={styles.mealRow}>
                            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.mealChip, selectedMeal === m && styles.mealChipActive]}
                                    onPress={() => setSelectedMeal(m)}
                                >
                                    <Text style={[styles.mealLabel, selectedMeal === m && styles.mealLabelActive]}>
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Items */}
                        {result.items.map((item, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.itemCard, selectedItems.has(i) && styles.itemCardSelected]}
                                onPress={() => toggleItem(i)}
                            >
                                <Ionicons
                                    name={selectedItems.has(i) ? 'checkbox' : 'square-outline'}
                                    size={22}
                                    color={selectedItems.has(i) ? Colors.primary : Colors.textTertiary}
                                />
                                <View style={styles.itemInfo}>
                                    <View style={styles.itemHeader}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        {item.price != null && (
                                            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                                        )}
                                    </View>
                                    <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                                    <View style={styles.macroRow}>
                                        <Text style={[styles.macroText, { color: Colors.calories }]}>{item.calories} kcal</Text>
                                        <Text style={[styles.macroText, { color: Colors.protein }]}>P {item.protein_g}g</Text>
                                        <Text style={[styles.macroText, { color: Colors.carbs }]}>C {item.carbs_g}g</Text>
                                        <Text style={[styles.macroText, { color: Colors.fat }]}>F {item.fat_g}g</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}

                        <View style={styles.summaryBar}>
                            <Text style={styles.summaryText}>
                                {selectedItems.size} selected — {totalCals} kcal total
                            </Text>
                        </View>

                        <Button
                            title={`Log ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''}`}
                            onPress={handleLogSelected}
                            disabled={selectedItems.size === 0}
                            style={{ marginTop: Spacing.md }}
                        />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    },
    title: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    cameraSection: { alignItems: 'center', marginTop: Spacing.xxl, gap: Spacing.lg },
    cameraHint: { color: Colors.textSecondary, fontSize: FontSize.md, textAlign: 'center', paddingHorizontal: Spacing.xl },
    cameraButtons: { flexDirection: 'row', gap: Spacing.lg },
    cameraBtn: {
        alignItems: 'center', gap: 6, backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
    },
    cameraBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    demoBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md,
        backgroundColor: Colors.secondary + '15', borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    },
    demoBtnText: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    imagePreview: { borderRadius: BorderRadius.md, overflow: 'hidden', marginBottom: Spacing.lg },
    receiptImage: { width: '100%', height: 200, borderRadius: BorderRadius.md },
    retakeBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'center', marginTop: Spacing.sm,
    },
    retakeText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    loadingRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        justifyContent: 'center', marginTop: Spacing.xl,
    },
    loadingText: { color: Colors.textSecondary, fontSize: FontSize.sm },
    resultSection: { marginTop: Spacing.lg },
    storeRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    storeName: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold, flex: 1 },
    storePrice: { color: Colors.secondary, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    mealRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    mealChip: {
        flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    mealChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
    mealLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
    mealLabelActive: { color: Colors.primary },
    itemCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        padding: Spacing.md, marginBottom: Spacing.sm,
        borderWidth: 1, borderColor: Colors.border,
    },
    itemCardSelected: { borderColor: Colors.primary + '50' },
    itemInfo: { flex: 1 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium, flex: 1 },
    itemPrice: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    itemQty: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
    macroRow: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
    macroText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
    summaryBar: {
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm,
        padding: Spacing.md, marginTop: Spacing.sm, alignItems: 'center',
    },
    summaryText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
});
