<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import apiClient from '@/api/client';
import { TrendingUp, TrendingDown, Building, DollarSign, Loader2 } from 'lucide-vue-next';
import { formatCurrency, formatNumber } from '@/utils/formatters';

const summary = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const toNumber = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fetchSummary = async () => {
  try {
    loading.value = true;
    error.value = null;
    const response = await apiClient.get('/summary');
    console.log('Dashboard Summary Data:', response.data);
    
    let data = response.data || {};
    if (Array.isArray(data)) {
      data = data[0] || {};
    }
    if (data.summary && typeof data.summary === 'object') {
      data = data.summary;
    }
    if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
      data = data.data;
    }
    
    const rawIncome =
      data.total_income ?? data.income ?? data.total_revenue ?? data.totalIncome ?? data.revenue ?? data.total_amount ?? data.totalIncomeAmount ?? 0;
    const rawExpenses =
      data.total_expenses ?? data.expenses ?? data.total_costs ?? data.totalExpenses ?? data.costs ?? data.total_spent ?? data.totalExpenseAmount ?? 0;
    const rawProperties =
      data.total_properties ?? data.property_count ?? data.properties_count ?? data.total_units ?? data.totalProperties ?? data.properties ?? data.count ?? data.total ?? 0;

    // Handle multiple possible key formats from API — always coerce to numbers so + never string-concatenates
    summary.value = {
      ...data,
      total_properties: toNumber(rawProperties),
      total_income: toNumber(rawIncome),
      total_expenses: toNumber(rawExpenses)
    };
  } catch (err) {
    console.error('Error fetching summary:', err);
    error.value = 'Failed to load dashboard summary. Please try again later.';
  } finally {
    loading.value = false;
  }
};

const totalIncome = computed(() => toNumber(summary.value?.total_income));
const totalExpenses = computed(() => toNumber(summary.value?.total_expenses));
const chartTotal = computed(() => totalIncome.value + totalExpenses.value);

/** Bar heights for Income vs Expenses (0–100). Avoids NaN when total is 0 or API sent strings. */
const incomeBarHeightPct = computed(() => {
  const t = chartTotal.value;
  if (t <= 0) return 0;
  return (totalIncome.value / t) * 100;
});

const expenseBarHeightPct = computed(() => {
  const t = chartTotal.value;
  if (t <= 0) return 0;
  return (totalExpenses.value / t) * 100;
});

/** Margin for donut: (income - expenses) / income, only when income > 0 */
const marginRatio = computed(() => {
  const inc = totalIncome.value;
  if (inc <= 0) return 0;
  return (inc - totalExpenses.value) / inc;
});

const marginPercent = computed(() => Math.round(Math.max(-100, Math.min(100, marginRatio.value * 100))));

const netProfit = computed(() => totalIncome.value - totalExpenses.value);

onMounted(fetchSummary);
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col space-y-2">
      <h2 class="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
      <p class="text-gray-500">Real-time performance of your property portfolio.</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <Loader2 class="w-12 h-12 text-indigo-600 animate-spin" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
      {{ error }}
    </div>

    <!-- Stats Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Properties -->
      <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
            <Building class="w-6 h-6 text-indigo-600" />
          </div>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">Properties</span>
        </div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-gray-900">{{ formatNumber(summary.total_properties) }}</span>
          <span class="text-sm text-gray-500">Active units</span>
        </div>
      </div>

      <!-- Total Income -->
      <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
            <TrendingUp class="w-6 h-6 text-emerald-600" />
          </div>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Income</span>
        </div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-gray-900">${{ formatCurrency(totalIncome) }}</span>
          <span class="text-sm text-emerald-600 font-medium">All time</span>
        </div>
      </div>

      <!-- Total Expenses -->
      <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-rose-50 rounded-lg group-hover:bg-rose-100 transition-colors">
            <TrendingDown class="w-6 h-6 text-rose-600" />
          </div>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Expenses</span>
        </div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-gray-900">${{ formatCurrency(totalExpenses) }}</span>
          <span class="text-sm text-rose-600 font-medium">All time</span>
        </div>
      </div>

      <!-- Net Profit -->
      <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
            <DollarSign class="w-6 h-6 text-amber-600" />
          </div>
          <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">Net Profit</span>
        </div>
        <div class="flex flex-col">
          <span class="text-2xl font-bold text-gray-900">${{ formatCurrency(netProfit) }}</span>
          <span class="text-sm text-gray-500">Portfolio balance</span>
        </div>
      </div>
    </div>

    <!-- Recent Activity or Charts could go here -->
    <div v-if="!loading && !error" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div class="lg:col-span-2 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <h3 class="text-xl font-bold text-gray-900 mb-6">Income vs Expenses</h3>
        <div v-if="chartTotal > 0" class="h-64 flex gap-8">
          <div class="flex-1 flex flex-col h-full min-h-0">
            <div class="flex-1 flex items-end min-h-0 w-full">
              <div
                class="w-full bg-emerald-500 rounded-t-lg transition-all duration-500 min-h-[4px]"
                :style="{ height: incomeBarHeightPct + '%' }"
              />
            </div>
            <span class="text-sm font-medium text-gray-600 text-center pt-3 shrink-0">Income</span>
          </div>
          <div class="flex-1 flex flex-col h-full min-h-0">
            <div class="flex-1 flex items-end min-h-0 w-full">
              <div
                class="w-full bg-rose-500 rounded-t-lg transition-all duration-500 min-h-[4px]"
                :style="{ height: expenseBarHeightPct + '%' }"
              />
            </div>
            <span class="text-sm font-medium text-gray-600 text-center pt-3 shrink-0">Expenses</span>
          </div>
        </div>
        <div v-else class="h-64 flex items-center justify-center rounded-lg bg-gray-50 border border-dashed border-gray-200 text-sm text-gray-500">
          Add income and expense records to see this comparison chart.
        </div>
      </div>

      <div class="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <h3 class="text-xl font-bold text-gray-900 mb-6">Portfolio Health</h3>
        <div class="flex flex-col items-center justify-center h-64 space-y-4">
          <div class="relative w-40 h-40">
            <svg class="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="#f3f4f6"
                stroke-width="12"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="transparent"
                stroke="#4f46e5"
                stroke-width="12"
                stroke-dasharray="440"
                :stroke-dashoffset="440 - (440 * Math.max(0, Math.min(1, totalIncome > 0 ? marginRatio : 0)))"
                stroke-linecap="round"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-3xl font-bold text-gray-900">
                {{ marginPercent }}%
              </span>
              <span class="text-xs text-gray-500 uppercase">Margin</span>
            </div>
          </div>
          <p class="text-sm text-gray-500 text-center">Your portfolio is performing well with a healthy margin.</p>
        </div>
      </div>
    </div>
  </div>
</template>
