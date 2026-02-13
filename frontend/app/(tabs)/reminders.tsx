import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../../src/context/ThemeContext';
import { useStore, Reminder } from '../../src/store/useStore';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isBefore, startOfDay } from 'date-fns';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function RemindersScreen() {
  const { colors } = useTheme();
  const { reminders, fetchReminders, createReminder, updateReminder, deleteReminder } = useStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [isRecurring, setIsRecurring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  useEffect(() => {
    fetchReminders();
    requestNotificationPermissions();
  }, [fetchReminders]);

  const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Notifications Disabled', 'Enable notifications in settings to receive expense reminders.');
      }
    }
  };

  const scheduleNotification = async (reminder: Reminder) => {
    const reminderDate = new Date(reminder.date);
    const [hours, minutes] = reminder.time.split(':').map(Number);
    const notificationDate = subDays(reminderDate, 1);
    notificationDate.setHours(hours, minutes, 0, 0);
    
    if (notificationDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: { title: `💰 Reminder: ${reminder.title}`, body: reminder.message || `Dont forget: ${reminder.title} is due tomorrow!`, sound: true },
        trigger: { date: notificationDate },
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReminders();
    setRefreshing(false);
  };

  const resetForm = useCallback(() => {
    setTitle('');
    setMessage('');
    setSelectedDate(addDays(new Date(), 1));
    setSelectedTime('09:00');
    setIsRecurring(false);
    setEditingReminder(null);
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a reminder title'); return; }
    if (isBefore(startOfDay(selectedDate), startOfDay(new Date()))) { Alert.alert('Invalid Date', 'Please select a future date'); return; }

    setIsSubmitting(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const reminderData = { title: title.trim(), message: message.trim(), date: selectedDate.toISOString(), time: selectedTime, is_recurring: isRecurring, is_enabled: true };

    if (editingReminder) { await updateReminder(editingReminder.id, reminderData); }
    else { await createReminder(reminderData); }

    await scheduleNotification({ ...reminderData, id: '', created_at: '' } as Reminder);
    setIsSubmitting(false);
    setShowAddModal(false);
    resetForm();
    await fetchReminders();
    Alert.alert('Success', `Reminder ${editingReminder ? 'updated' : 'created'}! You will be notified one day before.`);
  };

  const handleDelete = (reminder: Reminder) => {
    Alert.alert('Delete Reminder', `Are you sure you want to delete "${reminder.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); await deleteReminder(reminder.id); } },
    ]);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setMessage(reminder.message);
    setSelectedDate(new Date(reminder.date));
    setSelectedTime(reminder.time);
    setIsRecurring(reminder.is_recurring);
    setShowAddModal(true);
  };

  const handleToggleEnabled = async (reminder: Reminder) => {
    await Haptics.selectionAsync();
    await updateReminder(reminder.id, { is_enabled: !reminder.is_enabled });
  };

  const getDaysInMonth = useCallback(() => eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }), [currentMonth]);
  const getStartDayOfWeek = useCallback(() => getDay(startOfMonth(currentMonth)), [currentMonth]);

  const timeOptions = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  const renderCalendar = () => {
    const days = getDaysInMonth();
    const startDay = getStartDayOfWeek();
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const emptyDays = Array(startDay).fill(null);
    const allDays = [...emptyDays, ...days];
    const today = startOfDay(new Date());

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text }]}>{format(currentMonth, 'MMMM yyyy')}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekDaysRow}>{weekDays.map((day) => <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>{day}</Text>)}</View>
        <View style={styles.calendarGrid}>
          {allDays.map((day, index) => {
            const isPast = day && isBefore(startOfDay(day), today);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.calendarDay, day && isSameDay(day, selectedDate) && { backgroundColor: colors.primary }, isPast && { opacity: 0.3 }]}
                onPress={() => { if (day && !isPast) { Haptics.selectionAsync(); setSelectedDate(day); } }}
                disabled={!day || isPast}
              >
                {day && <Text style={[styles.calendarDayText, { color: isSameDay(day, selectedDate) ? '#FFFFFF' : colors.text }]}>{format(day, 'd')}</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderReminder = ({ item }: { item: Reminder }) => {
    const reminderDate = new Date(item.date);
    const isPast = isBefore(startOfDay(reminderDate), startOfDay(new Date()));
    
    return (
      <View style={[styles.reminderItem, { backgroundColor: colors.card, opacity: isPast ? 0.6 : 1 }]}>
        <TouchableOpacity style={styles.reminderContent} onPress={() => handleEdit(item)}>
          <View style={[styles.reminderIcon, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="notifications" size={24} color={colors.warning} />
          </View>
          <View style={styles.reminderDetails}>
            <Text style={[styles.reminderTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.reminderDate, { color: colors.textSecondary }]}>{format(reminderDate, 'dd MMM yyyy')} at {item.time}</Text>
            {item.message ? <Text style={[styles.reminderMessage, { color: colors.textSecondary }]} numberOfLines={1}>{item.message}</Text> : null}
            {item.is_recurring && <View style={styles.recurringBadge}><Ionicons name="repeat" size={12} color={colors.primary} /><Text style={[styles.recurringText, { color: colors.primary }]}>Monthly</Text></View>}
          </View>
        </TouchableOpacity>
        <View style={styles.reminderActions}>
          <Switch value={item.is_enabled} onValueChange={() => handleToggleEnabled(item)} trackColor={{ false: colors.inputBg, true: colors.primary + '50' }} thumbColor={item.is_enabled ? colors.primary : colors.textSecondary} />
          <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.danger + '15' }]} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Reminders</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Get notified one day before</Text>
        </View>
        <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => { resetForm(); setShowAddModal(true); }}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={reminders}
        renderItem={renderReminder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No reminders yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add reminders for upcoming expenses</Text>
          </View>
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalKeyboard}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{editingReminder ? 'Edit Reminder' : 'New Reminder'}</Text>
                <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Title *</Text>
                  <TextInput style={[styles.input, { color: colors.text, backgroundColor: colors.inputBg }]} placeholder="e.g., Rent Payment" placeholderTextColor={colors.textSecondary} value={title} onChangeText={setTitle} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Message (Optional)</Text>
                  <TextInput style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.inputBg }]} placeholder="e.g., Pay rent to landlord" placeholderTextColor={colors.textSecondary} value={message} onChangeText={setMessage} multiline numberOfLines={2} />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Due Date</Text>
                  <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.inputBg }]} onPress={() => setShowDatePicker(!showDatePicker)}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.dateButtonText, { color: colors.text }]}>{format(selectedDate, 'EEEE, dd MMMM yyyy')}</Text>
                    <Ionicons name={showDatePicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {showDatePicker && renderCalendar()}
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Notification Time</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.timeGrid}>
                      {timeOptions.map((time) => (
                        <TouchableOpacity key={time} style={[styles.timeButton, { backgroundColor: selectedTime === time ? colors.primary : colors.inputBg }]} onPress={() => { Haptics.selectionAsync(); setSelectedTime(time); }}>
                          <Text style={[styles.timeButtonText, { color: selectedTime === time ? '#FFFFFF' : colors.text }]}>{time}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <View style={[styles.toggleRow, { backgroundColor: colors.inputBg }]}>
                  <View>
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>Recurring Monthly</Text>
                    <Text style={[styles.toggleSubtext, { color: colors.textSecondary }]}>Repeat this reminder every month</Text>
                  </View>
                  <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ false: colors.border, true: colors.primary + '50' }} thumbColor={isRecurring ? colors.primary : colors.textSecondary} />
                </View>
                <View style={[styles.infoBox, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name="information-circle" size={20} color={colors.primary} />
                  <Text style={[styles.infoText, { color: colors.primary }]}>You will receive a notification one day before the due date at {selectedTime}</Text>
                </View>
                <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit} disabled={isSubmitting}>
                  <Text style={styles.submitButtonText}>{isSubmitting ? 'Saving...' : editingReminder ? 'Update Reminder' : 'Create Reminder'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  reminderItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 10 },
  reminderContent: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  reminderIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reminderDetails: { flex: 1, marginLeft: 12 },
  reminderTitle: { fontSize: 16, fontWeight: '600' },
  reminderDate: { fontSize: 13, marginTop: 2 },
  reminderMessage: { fontSize: 12, marginTop: 2 },
  recurringBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  recurringText: { fontSize: 11, fontWeight: '600' },
  reminderActions: { alignItems: 'center', gap: 8 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalKeyboard: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { padding: 16, borderRadius: 12, fontSize: 16 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  dateButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, gap: 12 },
  dateButtonText: { flex: 1, fontSize: 16 },
  calendarContainer: { marginTop: 12 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  monthTitle: { fontSize: 16, fontWeight: '600' },
  weekDaysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekDay: { width: 36, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  calendarDayText: { fontSize: 14, fontWeight: '500' },
  timeGrid: { flexDirection: 'row', gap: 8 },
  timeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  timeButtonText: { fontSize: 14, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, marginBottom: 16 },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  toggleSubtext: { fontSize: 12, marginTop: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 16, gap: 10 },
  infoText: { flex: 1, fontSize: 13 },
  submitButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
