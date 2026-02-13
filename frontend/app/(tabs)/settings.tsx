import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../src/context/ThemeContext';
import { useStore } from '../../src/store/useStore';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { exportCSV } = useStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your transactions, categories, and reminders. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await resetAllData();
            Alert.alert('Success', 'All data has been reset');
          },
        },
      ]
    );
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const csvContent = await exportCSV();
      
      const fileName = `expense_report_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(filePath, csvContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Expense Report',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    danger,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.iconContainer, { backgroundColor: (danger ? colors.danger : colors.primary) + '20' }]}>
        <Ionicons name={icon as any} size={22} color={danger ? colors.danger : colors.primary} />
      </View>
      <View style={styles.settingDetails}>
        <Text style={[styles.settingTitle, { color: danger ? colors.danger : colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <SettingItem
            icon="moon"
            title="Dark Mode"
            subtitle="Switch between light and dark themes"
            rightElement={
              <Switch
                value={isDark}
                onValueChange={() => {
                  Haptics.selectionAsync();
                  toggleTheme();
                }}
                trackColor={{ false: colors.inputBg, true: colors.primary + '50' }}
                thumbColor={isDark ? colors.primary : colors.textSecondary}
              />
            }
          />
        </View>

        {/* Currency Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CURRENCY</Text>
          <SettingItem
            icon="cash"
            title="Currency"
            subtitle="Indian Rupee (₹ INR)"
          />
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DATA</Text>
          <SettingItem
            icon="download"
            title="Export Data"
            subtitle={isExporting ? 'Exporting...' : 'Download your data as CSV'}
            onPress={handleExportCSV}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
          <SettingItem
            icon="information-circle"
            title="App Version"
            subtitle={APP_VERSION}
          />
          <SettingItem
            icon="heart"
            title="Made with love"
            subtitle="For Indian users 🇮🇳"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Expense Tracker
          </Text>
          <Text style={[styles.footerSubtext, { color: colors.textSecondary }]}>
            Your personal finance companion
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingDetails: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
});
