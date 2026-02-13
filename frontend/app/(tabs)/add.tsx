import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useStore, Category } from '../../src/store/useStore';
import { formatIndianRupee } from '../../src/utils/currency';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';

type TransactionType = 'expense' | 'income';

export default function AddScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { categories, fetchCategories, createTransaction } = useStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setAmount(cleaned);
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Select Category', 'Please select a category');
      return;
    }

    setIsSubmitting(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await createTransaction({
      amount: parseFloat(amount),
      category_id: selectedCategory.id,
      category_name: selectedCategory.name,
      type,
      date: selectedDate.toISOString(),
      note,
      is_recurring: isRecurring,
    });

    // Reset form
    setAmount('');
    setSelectedCategory(null);
    setNote('');
    setIsRecurring(false);
    setSelectedDate(new Date());
    setIsSubmitting(false);

    Alert.alert('Success', `${type === 'expense' ? 'Expense' : 'Income'} added successfully!`);
  };

  const filteredCategories = categories.filter((c) => {
    const incomeCategories = ['Salary', 'Investments'];
    if (type === 'income') {
      return incomeCategories.includes(c.name);
    }
    return !incomeCategories.includes(c.name);
  });

  // Calendar functions
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getStartDayOfWeek = () => {
    const start = startOfMonth(currentMonth);
    return getDay(start);
  };

  const renderCalendar = () => {
    const days = getDaysInMonth();
    const startDay = getStartDayOfWeek();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const emptyDays = Array(startDay).fill(null);
    const allDays = [...emptyDays, ...days];

    return (
      <View style={styles.calendarContainer}>
        {/* Month Navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity 
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={styles.monthNavButton}
          >
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          <TouchableOpacity 
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={styles.monthNavButton}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Week Days */}
        <View style={styles.weekDaysRow}>
          {weekDays.map((day) => (
            <Text key={day} style={[styles.weekDay, { color: colors.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {allDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                day && isSameDay(day, selectedDate) && { backgroundColor: colors.primary },
                day && isSameDay(day, new Date()) && !isSameDay(day, selectedDate) && { borderWidth: 1, borderColor: colors.primary },
              ]}
              onPress={() => {
                if (day) {
                  Haptics.selectionAsync();
                  setSelectedDate(day);
                }
              }}
              disabled={!day}
            >
              {day && (
                <Text
                  style={[
                    styles.calendarDayText,
                    { color: isSameDay(day, selectedDate) ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {format(day, 'd')}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickButton, { backgroundColor: colors.inputBg }]}
            onPress={() => {
              setSelectedDate(new Date());
              setCurrentMonth(new Date());
            }}
          >
            <Text style={[styles.quickButtonText, { color: colors.text }]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickButton, { backgroundColor: colors.inputBg }]}
            onPress={() => {
              const yesterday = subDays(new Date(), 1);
              setSelectedDate(yesterday);
              setCurrentMonth(yesterday);
            }}
          >
            <Text style={[styles.quickButtonText, { color: colors.text }]}>Yesterday</Text>
          </TouchableOpacity>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowDatePicker(false)}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Add Transaction</Text>
          </View>

          {/* Type Toggle */}
          <View style={[styles.typeToggle, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && { backgroundColor: colors.danger },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setType('expense');
                setSelectedCategory(null);
              }}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={type === 'expense' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  { color: type === 'expense' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && { backgroundColor: colors.success },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setType('income');
                setSelectedCategory(null);
              }}
            >
              <Ionicons
                name="arrow-down"
                size={20}
                color={type === 'income' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  { color: type === 'income' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={[styles.amountCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={[styles.currencySymbol, { color: colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                value={amount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
              />
            </View>
            {amount && (
              <Text style={[styles.formattedAmount, { color: colors.primary }]}>
                {formatIndianRupee(parseFloat(amount) || 0)}
              </Text>
            )}
          </View>

          {/* Date Picker */}
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <Text style={[styles.dateText, { color: colors.text }]}>
                {format(selectedDate, 'EEEE, dd MMMM yyyy')}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Category Selection */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <View style={styles.categoryGrid}>
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor:
                        selectedCategory?.id === category.id
                          ? category.color + '30'
                          : colors.inputBg,
                      borderWidth: selectedCategory?.id === category.id ? 2 : 0,
                      borderColor: category.color,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedCategory(category);
                  }}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryName,
                      { color: selectedCategory?.id === category.id ? category.color : colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note Input */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Note (Optional)</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.text, backgroundColor: colors.inputBg }]}
              placeholder="Add a note..."
              placeholderTextColor={colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Recurring Toggle */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Recurring Monthly</Text>
                <Text style={[styles.toggleSubtext, { color: colors.textSecondary }]}>
                  This transaction repeats every month
                </Text>
              </View>
              <Switch
                value={isRecurring}
                onValueChange={setIsRecurring}
                trackColor={{ false: colors.inputBg, true: colors.primary + '50' }}
                thumbColor={isRecurring ? colors.primary : colors.textSecondary}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: type === 'expense' ? colors.danger : colors.success },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Adding...' : `Add ${type === 'expense' ? 'Expense' : 'Income'}`}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {renderCalendar()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  typeToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 4,
    borderRadius: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
  },
  formattedAmount: {
    fontSize: 14,
    marginTop: 8,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryItem: {
    width: '30%',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  noteInput: {
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSubtext: {
    fontSize: 13,
    marginTop: 4,
  },
  submitButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  // Calendar styles
  calendarContainer: {
    paddingBottom: 20,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthNavButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDay: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  quickButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
