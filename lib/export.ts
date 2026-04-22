// ── Data Export Utility ───────────────────────────────────────
// Exports user data as CSV or JSON using expo-file-system + expo-sharing
// ─────────────────────────────────────────────────────────────

import { documentDirectory, EncodingType, writeAsStringAsync } from 'expo-file-system/legacy';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import { Platform } from 'react-native';

interface ExportOptions {
    format: 'csv' | 'json';
    filename: string;
    data: Record<string, any>[];
}

function toCsv(data: Record<string, any>[]): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
        headers.map((h) => {
            const val = row[h];
            if (val == null) return '';
            const str = String(val);
            // Escape CSV values containing commas, quotes, or newlines
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

/**
 * Export data to a file and open the share sheet
 */
export async function exportData({ format, filename, data }: ExportOptions): Promise<boolean> {
    if (Platform.OS === 'web') {
        // Web: download via blob
        const content = format === 'json' ? JSON.stringify(data, null, 2) : toCsv(data);
        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }

    try {
        const content = format === 'json' ? JSON.stringify(data, null, 2) : toCsv(data);
        const ext = format === 'json' ? 'json' : 'csv';
        const fileUri = `${documentDirectory}${filename}.${ext}`;

        await writeAsStringAsync(fileUri, content, {
            encoding: EncodingType.UTF8,
        });

        const canShare = await isAvailableAsync();
        if (canShare) {
            await shareAsync(fileUri, {
                mimeType: format === 'json' ? 'application/json' : 'text/csv',
                dialogTitle: `Export ${filename}`,
            });
        }
        return true;
    } catch (err) {
        console.error('Export failed:', err);
        return false;
    }
}

/**
 * Build exportable workout data from store state
 */
export function buildWorkoutExport(sessions: any[]): Record<string, any>[] {
    return sessions.map((s) => ({
        date: s.started_at || s.date,
        template: s.template_name || s.name || 'Custom',
        duration_min: s.duration ? Math.round(s.duration / 60) : 0,
        exercises: s.exercises?.length || 0,
        total_sets: s.exercises?.reduce((sum: number, e: any) => sum + (e.sets?.length || 0), 0) || 0,
        total_volume: s.exercises?.reduce((sum: number, e: any) =>
            sum + (e.sets?.reduce((s2: number, set: any) => s2 + ((set.weight || 0) * (set.reps || 0)), 0) || 0)
            , 0) || 0,
    }));
}

/**
 * Build exportable nutrition data
 */
export function buildNutritionExport(logs: any[]): Record<string, any>[] {
    return logs.map((l) => ({
        date: l.logged_at || l.date,
        meal: l.meal_type,
        food: l.food_name || l.name,
        servings: l.servings,
        calories: l.calories,
        protein_g: l.protein_g,
        carbs_g: l.carbs_g,
        fat_g: l.fat_g,
    }));
}

/**
 * Build exportable measurements
 */
export function buildMeasurementsExport(entries: any[]): Record<string, any>[] {
    return entries.map((e) => ({
        date: e.recorded_at || e.date,
        weight_kg: e.weight,
        body_fat_pct: e.body_fat_pct || '',
        ...e.measurements,
    }));
}
