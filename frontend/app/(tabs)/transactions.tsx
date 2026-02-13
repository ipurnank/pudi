import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/context/ThemeContext';
import { useStore, Transaction } from '../../src/store/useStore';
import { formatIndianRupee } from '../../src/utils/currency';
import { format } from 'date-fns';

type FilterType = 'all' | 'expense' | 'income';

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { transactions, fetchTransactions, deleteTransaction, categories, fetchCategories } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchTransactions(), fetchCategories()]);
  }, [fetchTransactions, fetchCategories]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await deleteTransaction(selectedTransaction.id);
    setShowActionModal(false);
    setSelectedTransaction(null);
  };

  const handleEdit = () => {
    if (!selectedTransaction) return;
    setShowActionModal(false);
    router.push({ pathname: '/edit-transaction', params: { id: selectedTransaction.id } });
  };

  const openActionModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowActionModal(true);
    Haptics.selectionAsync();
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.category_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.note && t.note.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const getCategoryIcon = (categoryId: string) => categories.find((c) => c.id === categoryId)?.icon || '💰';
  const getCategoryColor = (categoryId: string) => categories.find((c) => c.id === categoryId)?.color || colors.primary;

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={[styles.transactionItem, { backgroundColor: colors.card }]}
      onPress={() => openActionModal(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getCategoryColor(item.category_id) + '20' }]}>
        <Text style={styles.categoryIcon}>{getCategoryIcon(item.category_id)}</Text>
      </View>
      <View style={styles.transactionDetails}>
        <Text style={[styles.categoryName, { color: colors.text }]}>{item.category_name}</Text>
        <Text style={[styles.transactionNote, { color: colors.textSecondary }]}>
          {format(new Date(item.date), 'dd MMM yyyy')}{item.note ? ` • ${item.note}` : ''}
        </Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: item.type === 'income' ? colors.success : colors.danger }]}>
          {item.type === 'income' ? '+' : '-'}{formatIndianRupee(item.amount)}
        </Text>
        {item.is_recurring && <View style={styles.recurringBadge}><Ionicons name="repeat" size={12} color={colors.primary} /></View>}
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, { backgroundColor: filterType === type ? colors.primary : colors.inputBg }]}
      onPress={() => { Haptics.selectionAsync(); setFilterType(type); }}
    >
      <Text style={[styles.filterButtonText, { color: filterType === type ? '#FFFFFF' : colors.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} • Tap to edit/delete
        </Text>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterContainer}>
        <FilterButton type="all" label="All" />
        <FilterButton type="expense" label="Expenses" />
        <FilterButton type="income" label="Income" />
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'Try a different search' : 'Tap the + button to add one'}
            </Text>
          </View>
        }
      />

      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionModal(false)}>
          <View style={[styles.actionModal, { backgroundColor: colors.card }]}>
            {selectedTransaction && (
              <>
                <View style={styles.actionModalHeader}>
                  <View style={[styles.actionIcon, { backgroundColor: getCategoryColor(selectedTransaction.category_id) + '20' }]}>
                    <Text style={styles.actionIconText}>{getCategoryIcon(selectedTransaction.category_id)}</Text>
                  </View>
                  <View style={styles.actionHeaderText}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>{selectedTransaction.category_name}</Text>
                    <Text style={[styles.actionAmount, { color: selectedTransaction.type === 'income' ? colors.success : colors.danger }]}>
                      {selectedTransaction.type === 'income' ? '+' : '-'}{formatIndianRupee(selectedTransaction.amount)}
                    </Text>
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]} onPress={handleEdit}>
                    <Ionicons name="pencil" size={22} color={colors.primary} />
                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.danger + '15' }]} onPress={handleDelete}>
                    <Ionicons name="trash" size={22} color={colors.danger} />
                    <Text style={[styles.actionButtonText, { color: colors.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.inputBg }]} onPress={() => setShowActionModal(false)}>
                  <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginVertical: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  filterButtonText: { fontSize: 14, fontWeight: '600' },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  transactionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryIcon: { fontSize: 24 },
  transactionDetails: { flex: 1, marginLeft: 12 },
  categoryName: { fontSize: 16, fontWeight: '600' },
  transactionNote: { fontSize: 13, marginTop: 2 },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '700' },
  recurringBadge: { marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  actionModal: { width: '100%', maxWidth: 340, borderRadius: 20, padding: 20 },
  actionModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  actionIcon: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionIconText: { fontSize: 28 },
  actionHeaderText: { flex: 1, marginLeft: 12 },
  actionTitle: { fontSize: 18, fontWeight: '600' },
  actionAmount: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  actionButtonText: { fontSize: 16, fontWeight: '600' },
  cancelButton: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
});
