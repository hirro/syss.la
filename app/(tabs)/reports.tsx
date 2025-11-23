import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useTimeEntries } from '@/hooks/use-time-entries';
import type { TimeEntry } from '@/types/time';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DateRange = 'this-week' | 'last-week' | 'this-month' | 'last-month';

export default function ReportsScreen() {
  const router = useRouter();
  const { entries } = useTimeEntries();
  const insets = useSafeAreaInsets();
  const primaryColor = useThemeColor({}, 'primary');
  const secondaryTextColor = useThemeColor({}, 'secondaryText');
  const cardBg = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'border');
  const [dateRange, setDateRange] = useState<DateRange>('this-week');

  // Calculate date range based on selection
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (dateRange) {
      case 'this-week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Sunday
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      
      case 'last-week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 7); // Last Sunday
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      
      case 'this-month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      
      case 'last-month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { startDate: start, endDate: end };
  }, [dateRange]);

  // Get entries for selected date range
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const entryDate = new Date(entry.start);
      return entryDate >= startDate && entryDate < endDate;
    });
  }, [entries, startDate, endDate]);

  // Calculate total hours
  const totalHours = useMemo(() => {
    return filteredEntries.reduce((total, entry) => {
      if (entry.end) {
        const duration = new Date(entry.end).getTime() - new Date(entry.start).getTime();
        return total + duration / (1000 * 60 * 60); // Convert to hours
      }
      return total;
    }, 0);
  }, [filteredEntries]);

  // Group entries by day
  const entriesByDay = useMemo(() => {
    const grouped = new Map<string, { entries: TimeEntry[]; total: number }>();
    
    filteredEntries.forEach(entry => {
      const date = new Date(entry.start).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric'
      });
      
      if (!grouped.has(date)) {
        grouped.set(date, { entries: [], total: 0 });
      }
      
      const dayData = grouped.get(date)!;
      dayData.entries.push(entry);
      
      if (entry.end) {
        const duration = new Date(entry.end).getTime() - new Date(entry.start).getTime();
        dayData.total += duration / (1000 * 60 * 60);
      }
    });
    
    return grouped;
  }, [filteredEntries]);

  // Get days of current week for chart
  const weekDays = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, []);

  // Calculate hours per day for chart
  const hoursPerDay = useMemo(() => {
    return weekDays.map(day => {
      const dateStr = day.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric'
      });
      return entriesByDay.get(dateStr)?.total || 0;
    });
  }, [weekDays, entriesByDay]);

  const maxHours = Math.max(...hoursPerDay, 9); // Minimum 9 hours for scale

  const formatHours = (hours: number) => {
    return `${hours.toFixed(2)} h`;
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="title" style={styles.headerTitle}>Reports</ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={primaryColor} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          {/* Date Range Selector */}
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={[
                styles.dateSelectorButton,
                {
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: borderColor,
                },
                dateRange === 'this-week' && {
                  ...styles.dateSelectorButtonActive,
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }
              ]}
              onPress={() => setDateRange('this-week')}>
              <ThemedText style={[
                styles.dateSelectorText,
                { color: primaryColor },
                dateRange === 'this-week' && styles.dateSelectorTextActive
              ]}>
                This Week
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dateSelectorButton,
                {
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: borderColor,
                },
                dateRange === 'last-week' && {
                  ...styles.dateSelectorButtonActive,
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }
              ]}
              onPress={() => setDateRange('last-week')}>
              <ThemedText style={[
                styles.dateSelectorText,
                { color: primaryColor },
                dateRange === 'last-week' && styles.dateSelectorTextActive
              ]}>
                Last Week
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dateSelectorButton,
                {
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: borderColor,
                },
                dateRange === 'this-month' && {
                  ...styles.dateSelectorButtonActive,
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }
              ]}
              onPress={() => setDateRange('this-month')}>
              <ThemedText style={[
                styles.dateSelectorText,
                { color: primaryColor },
                dateRange === 'this-month' && styles.dateSelectorTextActive
              ]}>
                This Month
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dateSelectorButton,
                {
                  backgroundColor: cardBg,
                  borderWidth: 1,
                  borderColor: borderColor,
                },
                dateRange === 'last-month' && {
                  ...styles.dateSelectorButtonActive,
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                }
              ]}
              onPress={() => setDateRange('last-month')}>
              <ThemedText style={[
                styles.dateSelectorText,
                { color: primaryColor },
                dateRange === 'last-month' && styles.dateSelectorTextActive
              ]}>
                Last Month
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.sectionTitle}>TRACKED HOURS</ThemedText>
            
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Total</ThemedText>
              <ThemedText style={styles.summaryValue}>{formatHours(totalHours)}</ThemedText>
            </View>
            
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Billable</ThemedText>
              <View style={styles.summaryRight}>
                <ThemedText style={styles.summaryValue}>00.00 h</ThemedText>
                <ThemedText style={[styles.summaryPercent, { color: secondaryTextColor }]}>0%</ThemedText>
              </View>
            </View>
            
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Amount</ThemedText>
              <View style={styles.summaryRight}>
                <ThemedText style={styles.summaryValue}>0.00</ThemedText>
                <ThemedText style={[styles.summaryPercent, { color: secondaryTextColor }]}>USD</ThemedText>
              </View>
            </View>
          </View>

          {/* Chart */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.chartContainer}>
              <View style={styles.chartYAxis}>
                <ThemedText style={[styles.yAxisLabel, { color: secondaryTextColor }]}>9h</ThemedText>
                <ThemedText style={[styles.yAxisLabel, { color: secondaryTextColor }]}>6h</ThemedText>
                <ThemedText style={[styles.yAxisLabel, { color: secondaryTextColor }]}>3h</ThemedText>
                <ThemedText style={[styles.yAxisLabel, { color: secondaryTextColor }]}>0h</ThemedText>
              </View>
              
              <View style={styles.chartBars}>
                {weekDays.map((day, index) => {
                  const hours = hoursPerDay[index];
                  const heightPercent = (hours / maxHours) * 100;
                  
                  return (
                    <View key={index} style={styles.barContainer}>
                      <View style={styles.barWrapper}>
                        <View 
                          style={[
                            styles.bar, 
                            { 
                              height: `${heightPercent}%`,
                              backgroundColor: primaryColor,
                            }
                          ]} 
                        />
                      </View>
                      <ThemedText style={[styles.barLabel, { color: secondaryTextColor }]}>
                        {day.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
                      </ThemedText>
                      <ThemedText style={[styles.barDate, { color: secondaryTextColor }]}>
                        {day.getDate()}/{day.getMonth() + 1}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Daily Breakdown */}
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <ThemedText style={styles.sectionTitle}>DAILY BREAKDOWN</ThemedText>
            
            {Array.from(entriesByDay.entries()).map(([date, data]) => (
              <View key={date} style={styles.dayRow}>
                <View style={styles.dayInfo}>
                  <ThemedText style={styles.dayDate}>{date}</ThemedText>
                  <ThemedText style={[styles.dayEntries, { color: secondaryTextColor }]}>
                    {data.entries.length} {data.entries.length === 1 ? 'entry' : 'entries'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.dayTotal}>{formatHours(data.total)}</ThemedText>
              </View>
            ))}
            
            {entriesByDay.size === 0 && (
              <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
                No time entries for this week
              </ThemedText>
            )}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dateSelectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dateSelectorButtonActive: {},
  dateSelectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateSelectorTextActive: {
    color: '#FFFFFF',
  },
  card: {
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.7,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    opacity: 0.8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '600',
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  summaryPercent: {
    fontSize: 14,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 200,
    gap: 12,
  },
  chartYAxis: {
    justifyContent: 'space-between',
    paddingVertical: 8,
    width: 30,
  },
  yAxisLabel: {
    fontSize: 12,
    textAlign: 'right',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barWrapper: {
    width: '100%',
    height: 160,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  barDate: {
    fontSize: 10,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dayInfo: {
    flex: 1,
    gap: 4,
  },
  dayDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  dayEntries: {
    fontSize: 14,
  },
  dayTotal: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
