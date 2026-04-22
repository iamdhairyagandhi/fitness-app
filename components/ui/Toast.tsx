import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ── Toast types ──────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
}

// ── Global state ─────────────────────────────────────────────

let _showToast: (t: Omit<ToastMessage, 'id'>) => void = () => {};
let _showConfirm: (opts: ConfirmOptions) => void = () => {};

export const toast = {
    success: (title: string, message?: string) => _showToast({ type: 'success', title, message }),
    error: (title: string, message?: string) => _showToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) => _showToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) => _showToast({ type: 'info', title, message }),
    confirm: (opts: ConfirmOptions) => _showConfirm(opts),
};

// ── Icons & colors ───────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    success: { icon: 'checkmark-circle', color: Colors.success },
    error: { icon: 'alert-circle', color: Colors.error },
    warning: { icon: 'warning', color: Colors.warning },
    info: { icon: 'information-circle', color: Colors.primary },
};

// ── Single toast item ────────────────────────────────────────

function ToastItem({ item, onDismiss }: { item: ToastMessage; onDismiss: (id: string) => void }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;
    const config = TOAST_CONFIG[item.type];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
            ]).start(() => onDismiss(item.id));
        }, item.duration || 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }], borderLeftColor: config.color }]}>
            <Ionicons name={config.icon} size={22} color={config.color} />
            <View style={styles.toastContent}>
                <Text style={styles.toastTitle}>{item.title}</Text>
                {item.message ? <Text style={styles.toastMessage}>{item.message}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => onDismiss(item.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
        </Animated.View>
    );
}

// ── Provider ─────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [confirm, setConfirm] = useState<ConfirmOptions | null>(null);

    const handleShow = useCallback((t: Omit<ToastMessage, 'id'>) => {
        setToasts((prev) => [...prev.slice(-2), { ...t, id: Date.now().toString() }]);
    }, []);

    const handleDismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const handleConfirm = useCallback((opts: ConfirmOptions) => {
        setConfirm(opts);
    }, []);

    useEffect(() => {
        _showToast = handleShow;
        _showConfirm = handleConfirm;
    }, [handleShow, handleConfirm]);

    return (
        <View style={{ flex: 1 }}>
            {children}

            {/* Toast stack */}
            <View style={styles.toastContainer} pointerEvents="box-none">
                {toasts.map((t) => (
                    <ToastItem key={t.id} item={t} onDismiss={handleDismiss} />
                ))}
            </View>

            {/* Confirm modal */}
            {confirm && (
                <View style={styles.overlay}>
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>{confirm.title}</Text>
                        <Text style={styles.confirmMessage}>{confirm.message}</Text>
                        <View style={styles.confirmButtons}>
                            <TouchableOpacity
                                style={styles.confirmBtnCancel}
                                onPress={() => { confirm.onCancel?.(); setConfirm(null); }}
                            >
                                <Text style={styles.confirmBtnCancelText}>{confirm.cancelLabel || 'Cancel'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtnOk, confirm.destructive && styles.confirmBtnDestructive]}
                                onPress={() => { confirm.onConfirm(); setConfirm(null); }}
                            >
                                <Text style={styles.confirmBtnOkText}>{confirm.confirmLabel || 'Confirm'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: Spacing.lg,
        right: Spacing.lg,
        zIndex: 9999,
        gap: Spacing.sm,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.md,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    toastContent: { flex: 1 },
    toastTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    toastMessage: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },

    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9998,
    },
    confirmBox: {
        backgroundColor: Colors.surfaceElevated,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxl,
        width: '85%',
        maxWidth: 340,
    },
    confirmTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginBottom: Spacing.sm },
    confirmMessage: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xxl },
    confirmButtons: { flexDirection: 'row', gap: Spacing.md },
    confirmBtnCancel: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
    },
    confirmBtnCancelText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
    confirmBtnOk: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    confirmBtnDestructive: { backgroundColor: Colors.error },
    confirmBtnOkText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
