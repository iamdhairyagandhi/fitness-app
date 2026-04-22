import { toast } from '@/components/ui';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { generateId } from '@/lib/utils';
import { useProgressStore } from '@/stores/progressStore';
import type { ProgressPhoto } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const POSES: { value: ProgressPhoto['pose']; label: string; icon: string }[] = [
    { value: 'front', label: 'Front', icon: '🧍' },
    { value: 'side', label: 'Side', icon: '🧍‍♂️' },
    { value: 'back', label: 'Back', icon: '🔙' },
];

export default function ProgressPhotosScreen() {
    const insets = useSafeAreaInsets();
    const { progressPhotos, addProgressPhoto } = useProgressStore();
    const [selectedPose, setSelectedPose] = useState<ProgressPhoto['pose']>('front');

    const handleTakePhoto = async () => {
        if (Platform.OS === 'web') {
            toast.info('Camera', 'Camera access requires a mobile device. Adding demo photo.');
        }

        // In production: use expo-image-picker
        // For MVP: add a placeholder entry
        const photo: ProgressPhoto = {
            id: generateId(),
            user_id: '',
            image_url: `https://via.placeholder.com/400x600/1A1A2E/6C5CE7?text=${selectedPose}+pose`,
            pose: selectedPose,
            taken_at: new Date().toISOString(),
            weight_kg: null,
            notes: null,
        };

        addProgressPhoto(photo);
        toast.success('Photo Added', `${selectedPose} pose photo saved to your progress gallery.`);
    };

    const handlePickImage = async () => {
        // Same as take photo for demo
        handleTakePhoto();
    };

    const groupedPhotos = progressPhotos.reduce<Record<string, ProgressPhoto[]>>((acc, photo) => {
        const date = new Date(photo.taken_at).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(photo);
        return acc;
    }, {});

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Progress Photos</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Capture section */}
                <View style={styles.captureSection}>
                    <Text style={styles.sectionTitle}>Take a new photo</Text>

                    {/* Pose selector */}
                    <View style={styles.poseSelector}>
                        {POSES.map((pose) => (
                            <TouchableOpacity
                                key={pose.value}
                                style={[styles.poseChip, selectedPose === pose.value && styles.poseChipActive]}
                                onPress={() => setSelectedPose(pose.value)}
                            >
                                <Text style={styles.poseIcon}>{pose.icon}</Text>
                                <Text style={[
                                    styles.poseLabel,
                                    selectedPose === pose.value && styles.poseLabelActive,
                                ]}>{pose.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.captureButtons}>
                        <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}>
                            <Ionicons name="camera" size={24} color={Colors.primary} />
                            <Text style={styles.captureBtnText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.captureBtn} onPress={handlePickImage}>
                            <Ionicons name="images" size={24} color={Colors.primary} />
                            <Text style={styles.captureBtnText}>Gallery</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tipRow}>
                        <Ionicons name="bulb-outline" size={16} color={Colors.warning} />
                        <Text style={styles.tipText}>
                            Take photos in the same spot with similar lighting for best comparison
                        </Text>
                    </View>
                </View>

                {/* Photo gallery */}
                <Text style={styles.sectionTitle}>Your Photos</Text>

                {Object.keys(groupedPhotos).length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="images-outline" size={48} color={Colors.textTertiary} />
                        <Text style={styles.emptyText}>No progress photos yet</Text>
                        <Text style={styles.emptySubtext}>
                            Take your first photo to start tracking your visual progress
                        </Text>
                    </View>
                ) : (
                    Object.entries(groupedPhotos).map(([date, photos]) => (
                        <View key={date} style={styles.dateGroup}>
                            <Text style={styles.dateLabel}>{date}</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.photoRow}>
                                    {photos.map((photo) => (
                                        <View key={photo.id} style={styles.photoCard}>
                                            <View style={styles.photoPlaceholder}>
                                                <Ionicons name="person-outline" size={40} color={Colors.textTertiary} />
                                                <Text style={styles.poseTag}>{photo.pose}</Text>
                                            </View>
                                            {photo.weight_kg && (
                                                <Text style={styles.photoWeight}>{photo.weight_kg} kg</Text>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>
                    ))
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
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: {
        color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold,
        marginBottom: Spacing.md, marginTop: Spacing.lg,
    },

    // Capture
    captureSection: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    },
    poseSelector: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
    poseChip: {
        flex: 1, alignItems: 'center', gap: Spacing.xs,
        paddingVertical: Spacing.md, borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight, borderWidth: 1.5, borderColor: Colors.border,
    },
    poseChipActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceElevated },
    poseIcon: { fontSize: 24 },
    poseLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
    poseLabelActive: { color: Colors.primary },
    captureButtons: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
    captureBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.sm, backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md,
        paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    },
    captureBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
    tipRow: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
        backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.sm,
        padding: Spacing.sm,
    },
    tipText: { color: Colors.textTertiary, fontSize: FontSize.xs, flex: 1, lineHeight: 16 },

    // Gallery
    emptyState: { alignItems: 'center', paddingVertical: Spacing.huge, gap: Spacing.md },
    emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
    emptySubtext: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center' },
    dateGroup: { marginBottom: Spacing.lg },
    dateLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium, marginBottom: Spacing.sm },
    photoRow: { flexDirection: 'row', gap: Spacing.md },
    photoCard: {
        width: 140, borderRadius: BorderRadius.lg, overflow: 'hidden',
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    },
    photoPlaceholder: {
        width: '100%', height: 200, alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.surfaceLight,
    },
    poseTag: {
        position: 'absolute', bottom: 8, right: 8,
        backgroundColor: Colors.primary, color: Colors.text,
        fontSize: FontSize.xs, fontWeight: FontWeight.bold,
        paddingHorizontal: Spacing.sm, paddingVertical: 2,
        borderRadius: BorderRadius.sm, overflow: 'hidden',
    },
    photoWeight: {
        color: Colors.textSecondary, fontSize: FontSize.xs,
        textAlign: 'center', paddingVertical: Spacing.sm,
    },
});
