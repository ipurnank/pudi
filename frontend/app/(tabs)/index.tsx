import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { useTheme } from '../../src/context/ThemeContext';
import { useStore } from '../../src/store/useStore';
import { formatIndianRupee, formatCompactIndianRupee } from '../../src/utils/currency';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const { colors } = useTheme();
  const {
    monthlyAnalytics,
    lastSixMonths,
    fetchMonthlyAnalytics,
    fetchLastSixMonths,
    fetchCategories,
    categories,
    isLoading,
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchMonthlyAnalytics(selectedMonth.year, selectedMonth.month),
      fetchLastSixMonths(),
      fetchCategories(),
    ]);
  }, [selectedMonth, fetchMonthlyAnalytics, fetchLastSixMonths, fetchCategories]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const pieData = monthlyAnalytics?.category_breakdown
    ? Object.entries(monthlyAnalytics.category_breakdown).map(([name, value], index) => {
        const category = categories.find((c) => c.name === name);
        return {
          value: value as number,
          color: category?.color || `hsl(${index * 45}, 70%, 50%)`,
          text: name,
        };
      })
    : [];

  const barData = lastSixMonths.flatMap((item) => [
    { value: item.expense, label: item.month, frontColor: colors.danger, spacing: 2 },
    { value: item.income, frontColor: colors.success, spacing: 18 },
  ]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth((prev) => {
      let newMonth = prev.month + (direction === 'next' ? 1 : -1);
      let newYear = prev.year;
      if (newMonth > 12) { newMonth = 1; newYear += 1; }
      else if (newMonth < 1) { newMonth = 12; newYear -= 1; }
      return { year: newYear, month: newMonth };
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Track your finances</Text>
        </View>

        <View style={[styles.monthSelector, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthNav}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {getMonthName(selectedMonth.month)} {selectedMonth.year}
          </Text>
          <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthNav}>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {isLoading && !monthlyAnalytics ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={[styles.overviewCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Overview</Text>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="arrow-down" size={20} color={colors.success} />
                  </View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Income</Text>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {formatIndianRupee(monthlyAnalytics?.total_income || 0)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <View style={[styles.statIcon, { backgroundColor: colors.danger + '20' }]}>
                    <Ionicons name="arrow-up" size={20} color={colors.danger} />
                  </View>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expense</Text>
                  <Text style={[styles.statValue, { color: colors.danger }]}>
                    {formatIndianRupee(monthlyAnalytics?.total_expense || 0)}
                  </Text>
                </View>
              </View>
              <View style={[styles.balanceRow, { borderTopColor: colors.border }]}>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Balance</Text>
                  <Text style={[styles.balanceValue, { color: (monthlyAnalytics?.net_balance || 0) >= 0 ? colors.success : colors.danger }]}>
                    {formatIndianRupee(monthlyAnalytics?.net_balance || 0)}
                  </Text>
                </View>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Savings</Text>
                  <Text style={[styles.balanceValue, { color: colors.primary }]}>
                    {monthlyAnalytics?.savings_percentage || 0}%
                  </Text>
                </View>
              </View>
            </View>

            {pieData.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Expense Breakdown</Text>
                <View style={styles.pieContainer}>
                  <PieChart
                    data={pieData}
                    donut
                    radius={80}
                    innerRadius={50}
                    centerLabelComponent={() => (
                      <View style={styles.pieCenter}>
                        <Text style={[styles.pieCenterText, { color: colors.textSecondary }]}>Total</Text>
                        <Text style={[styles.pieCenterValue, { color: colors.text }]}>
                          {formatCompactIndianRupee(monthlyAnalytics?.total_expense || 0)}
                        </Text>
                      </View>
                    )}
                  />
                </View>
                <View style={styles.legendContainer}>
                  {pieData.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.text}</Text>
                      <Text style={[styles.legendValue, { color: colors.text }]}>{formatCompactIndianRupee(item.value)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {barData.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>6 Month Trend</Text>
                <View style={styles.barLegend}>
                  <View style={styles.barLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expense</Text>
                  </View>
                  <View style={styles.barLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                    <Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barData}
                    barWidth={20}
                    spacing={10}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={1}
                    yAxisThickness={0}
                    xAxisColor={colors.border}
                    yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                    noOfSections={4}
                    maxValue={Math.max(...barData.map((d) => d.value), 1000) * 1.2}
                    height={150}
                    width={width - 80}
                  />
                </ScrollView>
              </View>
            )}

            {!pieData.length && !barData.length && (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="wallet-outline" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No transactions yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add your first transaction to see analytics</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 16, marginTop: 4 },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginVertical: 16, padding: 12, borderRadius: 12 },
  monthNav: { padding: 8 },
  monthText: { fontSize: 18, fontWeight: '600' },
  loader: { marginTop: 50 },
  overviewCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statLabel: { fontSize: 13, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingTop: 20, borderTopWidth: 1 },
  balanceItem: { alignItems: 'center' },
  balanceLabel: { fontSize: 13, marginBottom: 4 },
  balanceValue: { fontSize: 22, fontWeight: '700' },
  chartCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
  pieContainer: { alignItems: 'center', marginVertical: 16 },
  pieCenter: { alignItems: 'center' },
  pieCenterText: { fontSize: 12 },
  pieCenterValue: { fontSize: 16, fontWeight: '700' },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, marginRight: 4 },
  legendValue: { fontSize: 12, fontWeight: '600' },
  barLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 16 },
  barLegendItem: { flexDirection: 'row', alignItems: 'center' },
  emptyState: { marginHorizontal: 20, borderRadius: 16, padding: 40, alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});
