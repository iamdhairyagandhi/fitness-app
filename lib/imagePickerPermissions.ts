import { toast } from '@/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking, Platform } from 'react-native';

function showSettingsAlert(title: string, message: string) {
    Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        {
            text: 'Open Settings',
            onPress: () => {
                const settingsLink = Platform.OS === 'ios'
                    ? Linking.openURL('app-settings:')
                    : Linking.openSettings();

                settingsLink.catch((error) => {
                    console.warn('[imagePickerPermissions] Failed to open app settings:', error);
                    toast.error('Settings Unavailable', 'Open Settings manually and enable the requested permission for this app.');
                });
            },
        },
    ]);
}

export async function requestCameraAccess() {
    try {
        const available = await ImagePicker.getCameraPermissionsAsync();
        const permission = available.granted ? available : await ImagePicker.requestCameraPermissionsAsync();
        if (permission.granted) return true;

        console.warn('[imagePickerPermissions] Camera permission denied:', {
            status: permission.status,
            canAskAgain: permission.canAskAgain,
            expires: permission.expires,
        });
        toast.warning('Camera Access Needed', 'Enable camera access in Settings to take photos.');
        showSettingsAlert(
            'Camera access needed',
            'Enable camera access in Settings to take meal, receipt, barcode, or progress photos.'
        );
        return false;
    } catch (error) {
        console.warn('[imagePickerPermissions] Camera permission request failed:', error);
        toast.error('Camera Unavailable', 'Could not check camera permission. Please try again.');
        return false;
    }
}

export async function requestPhotoLibraryAccess() {
    try {
        const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
        const permission = existing.granted ? existing : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.granted || permission.accessPrivileges === 'limited') return true;

        console.warn('[imagePickerPermissions] Photo library permission denied:', {
            status: permission.status,
            canAskAgain: permission.canAskAgain,
            accessPrivileges: permission.accessPrivileges,
            expires: permission.expires,
        });
        toast.warning('Photo Access Needed', 'Enable photo access in Settings to choose images.');
        showSettingsAlert(
            'Photo library access needed',
            'Enable photo access in Settings to choose existing meal, receipt, profile, or progress photos.'
        );
        return false;
    } catch (error) {
        console.warn('[imagePickerPermissions] Photo library permission request failed:', error);
        toast.error('Photos Unavailable', 'Could not check photo library permission. Please try again.');
        return false;
    }
}

export const imageOnlyPickerOptions: Pick<ImagePicker.ImagePickerOptions, 'mediaTypes'> = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
};
