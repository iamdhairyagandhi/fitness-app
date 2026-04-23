/**
 * Meal Photo Journal — Phase C #23
 *
 * Timeline view of meal photos with food log data
 */

import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useNutritionStore } from '@/stores/nutritionStore';
import type { MealPhotoEntry, MealType } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MEAL_EMOJI: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
};

function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export default function MealPhotosScreen() {
    const insets = useSafeAreaInsets();
    const { todaySummary } = useNutritionStore();

    // Local photo journal storage
    const [photos, setPhotos] = useState<MealPhotoEntry[]>([]);
    const [selectedMeal, setSelectedMeal] = useState<MealType | 'all'>('all');

    const takePhoto = async (mealType: MealType) => {
        try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (!perm.granted) return;

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (result.canceled || !result.assets?.[0]) return;

            const entry: MealPhotoEntry = {
                id: generateId(),
                food_log_id: '',
                photo_uri: result.assets[0].uri,
                meal_type: mealType,
                caption: null,
                logged_at: new Date().toISOString(),
            };
            setPhotos((prev) => [entry, ...prev]);
        } catch {
            // Silently handle camera failures
        }
    };

    const pickFromGallery = async (mealType: MealType) => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) return;

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.7,
                allowsEditing: true,
                aspect: [4, 3],
            });

            if (result.canceled || !result.assets?.[0]) return;

            const entry: MealPhotoEntry = {
                id: generateId(),
                food_log_id: '',
                photo_uri: result.assets[0].uri,
                meal_type: mealType,
                caption: null,
                logged_at: new Date().toISOString(),
            };
            setPhotos((prev) => [entry, ...prev]);
        } catch {
            // Silently handle gallery failures
        }
    };

    const filteredPhotos = selectedMeal === 'all' ? photos : photos.filter((p) => p.meal_type === selectedMeal);

    // Group photos by date
    const groupedByDate = filteredPhotos.reduce<Record<string, MealPhotoEntry[]>>((acc, photo) => {
        const date = photo.logged_at.split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(photo);
        return acc;
    }, {});

    const dateKeys = Object.keys(groupedByDate).sort().reverse();

    // Current meal summary for stats
    const allMeals = Object.values(todaySummary.meals).flat();
    const todayStats = {
        totalCals: todaySummary.total_calories,
        meals: allMeals.length,
        photos: photos.filter((p) => p.logged_at.startsWith(new Date().toISOString().split('T')[0])).length,
    };

    const removePhoto = (id: string) => {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
    };

    const renderPhotoCard = useCallback(({ item }: { item: MealPhotoEntry }) => (
        <View style={styles.photoCard}>
            <Image source={{ uri: item.photo_uri }} style={styles.photoImage} />
            <View style={styles.photoOverlay}>
                <View style={styles.photoMealBadge}>
                    <Text style={styles.photoMealEmoji}>{MEAL_EMOJI[item.meal_type]}</Text>
                    <Text style={styles.photoMealText}>{item.meal_type}</Text>
                </View>
                <Text style={styles.photoTime}>
                    {new Date(item.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removePhoto(item.id)}>
                <Ionicons name="close-circle" size={22} color={Colors.accent} />
            </TouchableOpacity>
        </View>
    ), []);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Meal Photos</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Today Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{todayStats.totalCals}</Text>
                    <Text style={styles.statLabel}>kcal today</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{todayStats.meals}</Text>
                    <Text style={styles.statLabel}>foods logged</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{todayStats.photos}</Text>
                    <Text style={styles.statLabel}>photos today</Text>
                </View>
            </View>

            {/* Quick Add Buttons */}
            <View style={styles.addRow}>
                {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => (
                    <TouchableOpacity key={m} style={styles.addBtn} onPress={() => takePhoto(m)}>
                        <Ionicons name="camera" size={18} color={Colors.primary} />
                        <Text style={styles.addBtnText}>{MEAL_EMOJI[m]} {m}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Gallery Pick */}
            <TouchableOpacity style={styles.galleryBtn} onPress={() => pickFromGallery('lunch')}>
                <Ionicons name="images-outline" size={18} color={Colors.secondary} />
                <Text style={styles.galleryBtnText}>Import from Gallery</Text>
            </TouchableOpacity>

            {/* Filter */}
            <View style={styles.filterRow}>
                {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, selectedMeal === f && styles.filterChipActive]}
                        onPress={() => setSelectedMeal(f)}
                    >
                        <Text style={[styles.filterText, selectedMeal === f && styles.filterTextActive]}>
                            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Photo Timeline */}
            {photos.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="camera-outline" size={56} color={Colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No meal photos yet</Text>
                    <Text style={styles.emptySubtitle}>
                        Snap a photo of your meals to build a visual food journal
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filteredPhotos}
                    keyExtractor={(p) => p.id}
                    renderItem={renderPhotoCard}
                    numColumns={2}
                    columnWrapperStyle={styles.photoRow}
                    contentContainerStyle={styles.photoList}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        dateKeys.length > 0 ? (
                            <Text style={styles.dateHeader}>
                                {dateKeys[0] === new Date().toISOString().split('T')[0] ? 'Today' : dateKeys[0]}
                            </Text>
                        ) : null
                    }
                />
            )}
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
    statsRow: {
        flexDirection: 'row', justifyContent: 'space-around',
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        backgroundColor: Colors.surface, marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.md, marginBottom: Spacing.md,
    },
    statItem: { alignItems: 'center' },
    statValue: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
    statLabel: { color: Colors.textTertiary, fontSize: FontSize.xs },
    addRow: {
        flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    addBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, backgroundColor: Colors.surface, borderRadius: BorderRadius.sm,
        paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    },
    addBtnText: { color: Colors.textSecondary, fontSize: FontSize.xxs },
    galleryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
        paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm,
        backgroundColor: Colors.surfaceLight,
    },
    galleryBtnText: { color: Colors.secondary, fontSize: FontSize.sm },
    filterRow: {
        flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    filterChip: {
        paddingHorizontal: Spacing.md, paddingVertical: 6,
        borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
        borderWidth: 1, borderColor: Colors.border,
    },
    filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' },
    filterText: { color: Colors.textSecondary, fontSize: FontSize.xs },
    filterTextActive: { color: Colors.primary },
    photoList: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    photoRow: { gap: Spacing.sm, marginBottom: Spacing.sm },
    dateHeader: {
        color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.semibold,
        marginBottom: Spacing.sm,
    },
    photoCard: {
        flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden',
        backgroundColor: Colors.surface, maxWidth: '49%',
    },
    photoImage: { width: '100%', height: 150 },
    photoOverlay: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: Spacing.sm,
    },
    photoMealBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    photoMealEmoji: { fontSize: 14 },
    photoMealText: { color: Colors.textSecondary, fontSize: FontSize.xs, textTransform: 'capitalize' },
    photoTime: { color: Colors.textTertiary, fontSize: FontSize.xxs },
    photoRemoveBtn: { position: 'absolute', top: 4, right: 4 },
    emptyState: { alignItems: 'center', marginTop: 80, gap: Spacing.md, paddingHorizontal: Spacing.xxl },
    emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
    emptySubtitle: { color: Colors.textTertiary, fontSize: FontSize.md, textAlign: 'center' },
});
