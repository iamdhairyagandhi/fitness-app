import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@/constants/theme';
import { Card, Button } from '@/components/ui';
import { useRecoveryStore } from '@/stores/recoveryStore';
import { generateId } from '@/lib/utils';

const COMMON_SUPPLEMENTS = [
    { name: 'Creatine Monohydrate', dosage: '5g', timing: 'anytime', icon: '💊' },
    { name: 'Whey Protein', dosage: '25-30g', timing: 'post_workout', icon: '🥤' },
    { name: 'Vitamin D3', dosage: '4000 IU', timing: 'morning', icon: '☀️' },
    { name: 'Omega-3 Fish Oil', dosage: '1000mg', timing: 'with_meal', icon: '🐟' },
    { name: 'Magnesium', dosage: '400mg', timing: 'evening', icon: '🧲' },
    { name: 'Zinc', dosage: '15mg', timing: 'evening', icon: '⚡' },
    { name: 'Caffeine', dosage: '200mg', timing: 'pre_workout', icon: '☕' },
    { name: 'Ashwagandha', dosage: '600mg', timing: 'evening', icon: '🌿' },
    { name: 'Multivitamin', dosage: '1 tablet', timing: 'morning', icon: '💊' },
    { name: 'BCAA', dosage: '5g', timing: 'intra_workout', icon: '🧪' },
];

export default function SupplementsScreen() {
    const insets = useSafeAreaInsets();
    const { supplements, supplementLogs, addSupplement, removeSupplement, logSupplement } = useRecoveryStore();
    const [showAdd, setShowAdd] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = supplementLogs.filter((l) => l.taken_at.startsWith(todayStr));

    const handleQuickAdd = (preset: typeof COMMON_SUPPLEMENTS[0]) => {
        addSupplement({
            id: generateId(),
            name: preset.name,
            dosage: preset.dosage,
            frequency: 'daily',
            timing: preset.timing,
            notes: null,
        });
        setShowAdd(false);
    };

    const handleRemove = (id: string, name: string) => {
        Alert.alert('Remove', `Remove ${name} from your stack?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => removeSupplement(id) },
        ]);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Supplements</Text>
                <TouchableOpacity onPress={() => setShowAdd(!showAdd)}>
                    <Ionicons name={showAdd ? 'close' : 'add'} size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Add supplement panel */}
                {showAdd && (
                    <View style={styles.addPanel}>
                        <Text style={styles.sectionTitle}>Quick Add</Text>
                        <View style={styles.presetGrid}>
                            {COMMON_SUPPLEMENTS.map((s) => {
                                const alreadyAdded = supplements.some((sup) => sup.name === s.name);
                                return (
                                    <TouchableOpacity
                                        key={s.name}
                                        style={[styles.presetChip, alreadyAdded && styles.presetChipDisabled]}
                                        onPress={() => !alreadyAdded && handleQuickAdd(s)}
                                        disabled={alreadyAdded}
                                    >
                                        <Text style={styles.presetIcon}>{s.icon}</Text>
                                        <Text style={[styles.presetName, alreadyAdded && styles.presetNameDisabled]}>{s.name}</Text>
                                        <Text style={styles.presetDose}>{s.dosage}</Text>
                                        {alreadyAdded && <Text style={styles.addedBadge}>✓</Text>}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Today's log */}
                {supplements.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Today's Supplements</Text>
                        <Text style={styles.todayCount}>
                            {todayLogs.length}/{supplements.length} taken
                        </Text>

                        {supplements.map((sup) => {
                            const taken = todayLogs.some((l) => l.supplement_id === sup.id);
                            return (
                                <Card key={sup.id} style={StyleSheet.flatten([styles.supplementCard, taken ? styles.supplementCardTaken : {}])}>
                                    <TouchableOpacity style={styles.supplementRow} onPress={() => !taken && logSupplement(sup.id)}>
                                        <View style={[styles.checkBox, taken && styles.checkBoxDone]}>
                                            {taken && <Ionicons name="checkmark" size={18} color={Colors.text} />}
                                        </View>
                                        <View style={styles.supplementInfo}>
                                            <Text style={[styles.supplementName, taken && styles.supplementNameTaken]}>{sup.name}</Text>
                                            <Text style={styles.supplementMeta}>{sup.dosage} • {sup.timing?.replace('_', ' ')}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemove(sup.id, sup.name)} hitSlop={8}>
                                            <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                </Card>
                            );
                        })}
                    </>
                )}

                {supplements.length === 0 && !showAdd && (
                    <View style={styles.empty}>
                        <Ionicons name="medical-outline" size={64} color={Colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No Supplements</Text>
                        <Text style={styles.emptySubtext}>Tap + to add supplements to your stack</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
    title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
    scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
    sectionTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.bold, marginTop: Spacing.xl, marginBottom: Spacing.md },
    todayCount: { color: Colors.textTertiary, fontSize: FontSize.sm, marginBottom: Spacing.md },

    addPanel: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
    presetGrid: { gap: Spacing.sm },
    presetChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceLight, borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.sm },
    presetChipDisabled: { opacity: 0.5 },
    presetIcon: { fontSize: 20 },
    presetName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium, flex: 1 },
    presetNameDisabled: { color: Colors.textTertiary },
    presetDose: { color: Colors.textSecondary, fontSize: FontSize.xs },
    addedBadge: { color: Colors.success, fontSize: FontSize.sm },

    supplementCard: { marginBottom: Spacing.sm },
    supplementCardTaken: { opacity: 0.6 },
    supplementRow: { flexDirection: 'row', alignItems: 'center' },
    checkBox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
    checkBoxDone: { backgroundColor: Colors.success, borderColor: Colors.success },
    supplementInfo: { flex: 1 },
    supplementName: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
    supplementNameTaken: { textDecorationLine: 'line-through', color: Colors.textTertiary },
    supplementMeta: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginTop: Spacing.lg },
    emptySubtext: { color: Colors.textTertiary, fontSize: FontSize.md, marginTop: Spacing.sm },
});
