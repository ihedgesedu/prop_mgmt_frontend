<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/api/client';
import { 
  ArrowLeft, Building2, MapPin, User, DollarSign, 
  TrendingUp, TrendingDown, Plus, Loader2, 
  Edit3, X
} from 'lucide-vue-next';
import { formatCurrency } from '@/utils/formatters';

const props = defineProps<{
  id: string
}>();

const route = useRoute();
const router = useRouter();
const propertyId = computed(() => props.id || route.params.id);

const property = ref<any>(null);
const incomeRecords = ref<any[]>([]);
const expenseRecords = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const activeTab = ref('income'); // 'income' or 'expenses'
const isIncomeModalOpen = ref(false);
const isExpenseModalOpen = ref(false);
const isEditFlyoutOpen = ref(false);
const isConfirmModalOpen = ref(false);
const pendingChanges = ref<string[]>([]);
const progressBannerMessage = ref<string | null>(null);
let progressBannerTimer: ReturnType<typeof setTimeout> | null = null;

const defaultPropertyForm = () => ({
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  property_type: 'Apartment',
  tenant_name: '',
  monthly_rent: 0
});

const editPropertyForm = ref(defaultPropertyForm());
const originalEditProperty = ref(defaultPropertyForm());

const newIncome = ref({
  property_id: Number(propertyId),
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  description: ''
});

const newExpense = ref({
  property_id: Number(propertyId),
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  category: 'Maintenance',
  vendor: '',
  description: ''
});

const fetchData = async () => {
  let currentId = propertyId.value;
  console.log('Fetching data for property ID:', currentId);
  
  // Handle case where currentId might be an object or string
  if (typeof currentId === 'object' && currentId !== null) {
    currentId = (currentId as any).id || (currentId as any).property_id;
  }

  if (!currentId || isNaN(Number(currentId))) {
    error.value = `Invalid property ID: ${JSON.stringify(currentId)}`;
    loading.value = false;
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    const id = Number(currentId);
    
    // Fetch property details first, as it's the most critical
    const propRes = await apiClient.get(`/properties/${id}`);
    let propData = propRes.data || {};
    
    // Handle potential array response
    if (Array.isArray(propData)) {
      propData = propData[0] || {};
    }
    
    // Handle potential nesting (e.g., { "property": { ... } } or { "data": { ... } })
    if (propData.property && typeof propData.property === 'object') {
      propData = propData.property;
    } else if (propData.data && typeof propData.data === 'object' && !Array.isArray(propData.data)) {
      propData = propData.data;
    }

    console.log('Processed Property Data:', propData);

    property.value = {
      ...propData,
      id: propData.id ?? propData.property_id,
      name: propData.name ?? propData.property_name ?? 'Unnamed Property',
      address: propData.address ?? propData.property_address ?? propData.location ?? 'No Address',
      city: propData.city ?? '',
      state: propData.state ?? '',
      postal_code: propData.postal_code ?? propData.zip_code ?? '',
      monthly_rent: propData.monthly_rent ?? propData.rent ?? propData.rent_amount ?? 0,
      tenant_name: propData.tenant_name ?? propData.tenant ?? propData.occupant ?? 'Vacant'
    };

    // Fetch income and expenses separately to handle potential 404s (no records)
    const fetchSubResource = async (path: string) => {
      try {
        const res = await apiClient.get(path);
        return res.data;
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          console.warn(`Resource not found (404) at ${path}, assuming empty list.`);
          return [];
        }
        throw err;
      }
    };

    const [incomeDataRaw, expenseDataRaw] = await Promise.all([
      fetchSubResource(`/income/${id}`),
      fetchSubResource(`/expenses/${id}`)
    ]);
    
    let incomeData = incomeDataRaw;
    if (incomeData && typeof incomeData === 'object' && !Array.isArray(incomeData)) {
      incomeData = incomeData.income || incomeData.data || [];
    }
    incomeRecords.value = (incomeData || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let expenseData = expenseDataRaw;
    if (expenseData && typeof expenseData === 'object' && !Array.isArray(expenseData)) {
      expenseData = expenseData.expenses || expenseData.data || [];
    }
    expenseRecords.value = (expenseData || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err: any) {
    console.error('Error fetching property data:', err);
    if (err.response && err.response.status === 404) {
      error.value = `Property with ID ${currentId} not found.`;
    } else {
      error.value = 'Failed to load property details. Please ensure the property exists.';
    }
  } finally {
    loading.value = false;
  }
};

const showProgressBanner = (message: string) => {
  progressBannerMessage.value = message;
  if (progressBannerTimer) clearTimeout(progressBannerTimer);
  progressBannerTimer = setTimeout(() => {
    progressBannerMessage.value = null;
  }, 2200);
};

// Re-fetch if ID changes
watch(propertyId, (newId) => {
  if (newId) fetchData();
});

const addIncome = async () => {
  try {
    showProgressBanner('Adding income in progress');
    await apiClient.post('/income', newIncome.value);
    await fetchData();
    isIncomeModalOpen.value = false;
    newIncome.value = {
      property_id: Number(propertyId.value),
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: ''
    };
  } catch (err) {
    console.error('Error adding income:', err);
    alert('Failed to add income record.');
  }
};

const addExpense = async () => {
  try {
    showProgressBanner('Adding expense in progress');
    await apiClient.post('/expenses', newExpense.value);
    await fetchData();
    isExpenseModalOpen.value = false;
    newExpense.value = {
      property_id: Number(propertyId.value),
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      category: 'Maintenance',
      vendor: '',
      description: ''
    };
  } catch (err) {
    console.error('Error adding expense:', err);
    alert('Failed to add expense record.');
  }
};

const totalIncome = computed(() => incomeRecords.value.reduce((sum, r) => sum + r.amount, 0));
const totalExpenses = computed(() => expenseRecords.value.reduce((sum, r) => sum + r.amount, 0));
const netProfit = computed(() => totalIncome.value - totalExpenses.value);

const editableFieldLabels: Record<string, string> = {
  name: 'Name',
  address: 'Address',
  city: 'City',
  state: 'State',
  postal_code: 'Postal Code',
  property_type: 'Property Type',
  tenant_name: 'Tenant Name',
  monthly_rent: 'Monthly Rent'
};

const toDisplay = (value: string | number) => {
  if (typeof value === 'number') return `${formatCurrency(value)}`;
  return value || '(empty)';
};

const openEditFlyout = () => {
  if (!property.value) return;
  const normalized = {
    name: property.value.name ?? '',
    address: property.value.address ?? '',
    city: property.value.city ?? '',
    state: property.value.state ?? '',
    postal_code: property.value.postal_code ?? '',
    property_type: property.value.property_type ?? 'Apartment',
    tenant_name: property.value.tenant_name ?? '',
    monthly_rent: Number(property.value.monthly_rent ?? 0)
  };

  originalEditProperty.value = { ...normalized };
  editPropertyForm.value = { ...normalized };
  pendingChanges.value = [];
  isConfirmModalOpen.value = false;
  isEditFlyoutOpen.value = true;
};

const closeEditFlyout = () => {
  isEditFlyoutOpen.value = false;
  isConfirmModalOpen.value = false;
  pendingChanges.value = [];
};

const buildChanges = () => {
  const payload: Record<string, any> = {};
  const changes: string[] = [];
  const keys = Object.keys(editableFieldLabels) as Array<keyof typeof editPropertyForm.value>;

  keys.forEach((key) => {
    const originalValue = originalEditProperty.value[key];
    const nextValue = editPropertyForm.value[key];
    if (originalValue !== nextValue) {
      payload[key] = nextValue;
      changes.push(`${editableFieldLabels[key]}: ${toDisplay(originalValue)} -> ${toDisplay(nextValue)}`);
    }
  });

  return { payload, changes };
};

const openChangesConfirmation = () => {
  const { changes } = buildChanges();
  if (changes.length === 0) {
    alert('No changes detected.');
    return;
  }
  pendingChanges.value = changes;
  isConfirmModalOpen.value = true;
};

const confirmEditProperty = async () => {
  const currentId = Number(propertyId.value);
  const { payload } = buildChanges();

  if (!currentId || Object.keys(payload).length === 0) {
    isConfirmModalOpen.value = false;
    return;
  }

  try {
    showProgressBanner('Updating property in progress');
    await apiClient.patch(`/properties/${currentId}`, payload);
    await fetchData();
    closeEditFlyout();
  } catch (err) {
    console.error('Error updating property:', err);
    alert('Failed to update property details.');
  }
};

onMounted(fetchData);
</script>

<template>
  <div class="space-y-8">
    <div
      v-if="progressBannerMessage"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[160] bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-xl text-base font-bold"
    >
      {{ progressBannerMessage }}
    </div>

    <!-- Back Button & Header -->
    <div class="flex flex-col space-y-4">
      <button 
        @click="router.back()"
        class="inline-flex items-center text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors group"
      >
        <ArrowLeft class="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Properties
      </button>
      
      <div v-if="property" class="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div class="flex items-start space-x-6">
          <div class="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <Building2 class="w-10 h-10 text-indigo-600" />
          </div>
          <div class="space-y-2">
            <h2 class="text-4xl font-bold text-gray-900">{{ property.name }}</h2>
            <div class="flex items-center text-gray-500">
              <MapPin class="w-4 h-4 mr-2" />
              <span>{{ property.address }}, {{ property.city }}, {{ property.state }} {{ property.postal_code }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <button
            @click="openEditFlyout"
            class="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-white transition-all shadow-sm"
            title="Edit property"
          >
            <Edit3 class="w-4 h-4" />
          </button>
          <div class="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center min-w-[120px]">
            <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">Monthly Rent</span>
            <span class="text-xl font-bold text-indigo-600">${{ formatCurrency(property.monthly_rent) }}</span>
          </div>
          <div class="px-4 py-2 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col items-center min-w-[120px]">
            <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">Tenant</span>
            <span class="text-xl font-bold text-gray-900">{{ property.tenant_name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <Loader2 class="w-12 h-12 text-indigo-600 animate-spin" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
      {{ error }}
    </div>

    <template v-else>
      <!-- Financial Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div class="p-3 bg-emerald-50 rounded-lg">
            <TrendingUp class="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Income</p>
            <p class="text-2xl font-bold text-gray-900">${{ formatCurrency(totalIncome) }}</p>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div class="p-3 bg-rose-50 rounded-lg">
            <TrendingDown class="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Expenses</p>
            <p class="text-2xl font-bold text-gray-900">${{ formatCurrency(totalExpenses) }}</p>
          </div>
        </div>
        <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div class="p-3 bg-amber-50 rounded-lg">
            <DollarSign class="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-500 uppercase tracking-wider">Net Profit</p>
            <p class="text-2xl font-bold text-gray-900" :class="netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'">
              ${{ formatCurrency(netProfit) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Tabs for Income/Expenses -->
      <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div class="flex border-b border-gray-100">
          <button 
            @click="activeTab = 'income'"
            class="flex-1 py-4 text-sm font-bold transition-colors relative"
            :class="activeTab === 'income' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'"
          >
            Income Records
            <div v-if="activeTab === 'income'" class="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"></div>
          </button>
          <button 
            @click="activeTab = 'expenses'"
            class="flex-1 py-4 text-sm font-bold transition-colors relative"
            :class="activeTab === 'expenses' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'"
          >
            Expense Records
            <div v-if="activeTab === 'expenses'" class="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600"></div>
          </button>
        </div>

        <div class="p-8">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-xl font-bold text-gray-900">
              {{ activeTab === 'income' ? 'Income History' : 'Expense History' }}
            </h3>
            <button 
              @click="activeTab === 'income' ? isIncomeModalOpen = true : isExpenseModalOpen = true"
              class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus class="w-5 h-5 mr-2" />
              Add {{ activeTab === 'income' ? 'Income' : 'Expense' }}
            </button>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th class="pb-4">Date</th>
                  <th class="pb-4">Description</th>
                  <th v-if="activeTab === 'expenses'" class="pb-4">Category</th>
                  <th v-if="activeTab === 'expenses'" class="pb-4">Vendor</th>
                  <th class="pb-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <template v-if="activeTab === 'income'">
                  <tr v-for="record in incomeRecords" :key="record.id" class="group hover:bg-gray-50 transition-colors">
                    <td class="py-4 text-sm text-gray-600">{{ record.date }}</td>
                    <td class="py-4 text-sm font-medium text-gray-900">{{ record.description }}</td>
                    <td class="py-4 text-sm font-bold text-emerald-600 text-right">+${{ formatCurrency(record.amount) }}</td>
                  </tr>
                  <tr v-if="incomeRecords.length === 0">
                    <td colspan="3" class="py-12 text-center text-gray-400 italic">No income records found.</td>
                  </tr>
                </template>
                <template v-else>
                  <tr v-for="record in expenseRecords" :key="record.id" class="group hover:bg-gray-50 transition-colors">
                    <td class="py-4 text-sm text-gray-600">{{ record.date }}</td>
                    <td class="py-4 text-sm font-medium text-gray-900">{{ record.description }}</td>
                    <td class="py-4">
                      <span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-md">
                        {{ record.category }}
                      </span>
                    </td>
                    <td class="py-4 text-sm text-gray-600">{{ record.vendor }}</td>
                    <td class="py-4 text-sm font-bold text-rose-600 text-right">-${{ formatCurrency(record.amount) }}</td>
                  </tr>
                  <tr v-if="expenseRecords.length === 0">
                    <td colspan="5" class="py-12 text-center text-gray-400 italic">No expense records found.</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Income Modal -->
    <div v-if="isIncomeModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-2xl font-bold text-gray-900">Add Income</h3>
          <button @click="isIncomeModalOpen = false" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X class="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <form @submit.prevent="addIncome" class="p-8 space-y-6">
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Amount ($)</label>
              <input v-model.number="newIncome.amount" required type="number" step="0.01" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Date</label>
              <input v-model="newIncome.date" required type="date" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Description</label>
              <textarea v-model="newIncome.description" required class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24" placeholder="e.g. Monthly Rent Payment"></textarea>
            </div>
          </div>
          <div class="flex justify-end space-x-4">
            <button type="button" @click="isIncomeModalOpen = false" class="px-6 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">Save Income</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Expense Modal -->
    <div v-if="isExpenseModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-2xl font-bold text-gray-900">Add Expense</h3>
          <button @click="isExpenseModalOpen = false" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X class="w-6 h-6 text-gray-400" />
          </button>
        </div>
        <form @submit.prevent="addExpense" class="p-8 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Amount ($)</label>
              <input v-model.number="newExpense.amount" required type="number" step="0.01" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Date</label>
              <input v-model="newExpense.date" required type="date" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Category</label>
              <select v-model="newExpense.category" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option>Maintenance</option>
                <option>Utilities</option>
                <option>Taxes</option>
                <option>Insurance</option>
                <option>Management Fee</option>
                <option>Other</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Vendor</label>
              <input v-model="newExpense.vendor" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. ABC Plumbing" />
            </div>
            <div class="md:col-span-2 space-y-2">
              <label class="text-sm font-semibold text-gray-700">Description</label>
              <textarea v-model="newExpense.description" required class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24" placeholder="e.g. Fixed leaking pipe in kitchen"></textarea>
            </div>
          </div>
          <div class="flex justify-end space-x-4">
            <button type="button" @click="isExpenseModalOpen = false" class="px-6 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">Save Expense</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Property Flyout -->
    <div v-if="isEditFlyoutOpen" class="fixed inset-0 z-[120]">
      <div class="absolute inset-0 bg-black/40" @click="closeEditFlyout"></div>
      <aside class="absolute top-0 right-0 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">Edit Property</h3>
          <button @click="closeEditFlyout" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X class="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form @submit.prevent="openChangesConfirmation" class="p-6 space-y-5 overflow-y-auto flex-1">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700">Property Name</label>
            <input v-model="editPropertyForm.name" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700">Property Type</label>
            <select v-model="editPropertyForm.property_type" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              <option>Apartment</option>
              <option>House</option>
              <option>Commercial</option>
              <option>Industrial</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700">Address</label>
            <input v-model="editPropertyForm.address" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">City</label>
              <input v-model="editPropertyForm.city" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">State</label>
              <input v-model="editPropertyForm.state" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700">Postal Code</label>
            <input v-model="editPropertyForm.postal_code" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700">Tenant Name</label>
            <input v-model="editPropertyForm.tenant_name" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-gray-700">Monthly Rent ($)</label>
            <input v-model.number="editPropertyForm.monthly_rent" required type="number" step="0.01" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div class="sticky bottom-0 bg-white pt-4">
            <button type="submit" class="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
              Confirm Edits
            </button>
          </div>
        </form>
      </aside>
    </div>

    <!-- Edit Confirmation Modal -->
    <div v-if="isConfirmModalOpen" class="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60">
      <div class="bg-white rounded-xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
        <h4 class="text-lg font-bold text-gray-900">Please confirm you want to make the following changes</h4>
        <ul class="space-y-2 max-h-64 overflow-y-auto">
          <li v-for="change in pendingChanges" :key="change" class="text-sm text-gray-700 bg-gray-50 rounded-md px-3 py-2">
            {{ change }}
          </li>
        </ul>
        <div class="flex justify-end space-x-3 pt-2">
          <button @click="isConfirmModalOpen = false" class="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button @click="confirmEditProperty" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Yes, apply changes
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
