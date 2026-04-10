<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import apiClient from '@/api/client';
import { Plus, Loader2, Search, X, MapPin, User, ChevronRight } from 'lucide-vue-next';
import { formatCurrency } from '@/utils/formatters';

const properties = ref<any[]>([]);
const incomeRecords = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const isIncomeModalOpen = ref(false);
const isPropertyPickerOpen = ref(false);
const propertySearchQuery = ref('');
const selectedProperty = ref<any | null>(null);
const progressBannerMessage = ref<string | null>(null);
let progressBannerTimer: ReturnType<typeof setTimeout> | null = null;

const newIncome = ref({
  property_id: 0,
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  description: ''
});

const showProgressBanner = (message: string) => {
  progressBannerMessage.value = message;
  if (progressBannerTimer) clearTimeout(progressBannerTimer);
  progressBannerTimer = setTimeout(() => {
    progressBannerMessage.value = null;
  }, 2200);
};

const normalizeProperty = (p: any) => ({
  ...p,
  id: p.id ?? p.property_id,
  name: p.name ?? p.property_name ?? 'Unnamed Property',
  address: p.address ?? p.property_address ?? p.location ?? 'No Address',
  city: p.city ?? '',
  state: p.state ?? '',
  postal_code: p.postal_code ?? p.zip_code ?? '',
  property_type: p.property_type ?? 'Unknown',
  tenant_name: p.tenant_name ?? p.tenant ?? p.occupant ?? 'Vacant'
});

const fetchData = async () => {
  try {
    loading.value = true;
    error.value = null;

    const propertyRes = await apiClient.get('/properties');
    let rawProperties = propertyRes.data;
    if (rawProperties && typeof rawProperties === 'object' && !Array.isArray(rawProperties)) {
      rawProperties = rawProperties.properties || rawProperties.data || [];
    }
    properties.value = (rawProperties || []).map(normalizeProperty);

    const incomeLists = await Promise.all(
      properties.value.map(async (property) => {
        try {
          const res = await apiClient.get(`/income/${property.id}`);
          let data = res.data;
          if (data && typeof data === 'object' && !Array.isArray(data)) {
            data = data.income || data.data || [];
          }
          return (data || []).map((record: any) => ({
            ...record,
            property_id: record.property_id ?? property.id,
            property_name: property.name,
            property_address: property.address
          }));
        } catch (err: any) {
          if (err.response?.status === 404) return [];
          throw err;
        }
      })
    );

    incomeRecords.value = incomeLists
      .flat()
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (err) {
    console.error('Error loading income page:', err);
    error.value = 'Failed to load income records.';
  } finally {
    loading.value = false;
  }
};

const filteredProperties = computed(() => {
  const query = propertySearchQuery.value.trim().toLowerCase();
  if (!query) return properties.value;

  return properties.value.filter((property) =>
    [
      property.name,
      property.tenant_name,
      property.address,
      property.city,
      property.state,
      property.property_type
    ]
      .join(' ')
      .toLowerCase()
      .includes(query)
  );
});

const selectProperty = (property: any) => {
  selectedProperty.value = property;
  newIncome.value.property_id = Number(property.id);
  isPropertyPickerOpen.value = false;
};

const resetIncomeForm = () => {
  newIncome.value = {
    property_id: 0,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: ''
  };
  selectedProperty.value = null;
  propertySearchQuery.value = '';
  isPropertyPickerOpen.value = false;
};

const addIncome = async () => {
  if (!newIncome.value.property_id) {
    alert('Please select a property before saving income.');
    return;
  }

  try {
    showProgressBanner('Adding income in progress');
    await apiClient.post('/income', newIncome.value);
    await fetchData();
    isIncomeModalOpen.value = false;
    resetIncomeForm();
  } catch (err) {
    console.error('Error adding income:', err);
    alert('Failed to add income record.');
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

    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-3xl font-bold text-gray-900">Income</h2>
        <p class="text-gray-500">View and manage all income records across properties.</p>
      </div>
      <button
        @click="isIncomeModalOpen = true"
        class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Plus class="w-5 h-5 mr-2" />
        Add Income
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center h-64">
      <Loader2 class="w-12 h-12 text-indigo-600 animate-spin" />
    </div>
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{{ error }}</div>
    <div v-else class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th class="px-6 py-4">Date</th>
              <th class="px-6 py-4">Property</th>
              <th class="px-6 py-4">Description</th>
              <th class="px-6 py-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="record in incomeRecords" :key="`${record.id}-${record.property_id}`" class="hover:bg-gray-50">
              <td class="px-6 py-4 text-sm text-gray-600">{{ record.date }}</td>
              <td class="px-6 py-4">
                <p class="text-sm font-semibold text-gray-900">{{ record.property_name }}</p>
                <p class="text-xs text-gray-500">{{ record.property_address }}</p>
              </td>
              <td class="px-6 py-4 text-sm text-gray-700">{{ record.description }}</td>
              <td class="px-6 py-4 text-sm font-bold text-emerald-600 text-right">+${{ formatCurrency(record.amount) }}</td>
            </tr>
            <tr v-if="incomeRecords.length === 0">
              <td colspan="4" class="px-6 py-12 text-center text-gray-400 italic">No income records found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isIncomeModalOpen" class="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
      <div class="relative w-full max-w-6xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl">
        <div class="absolute inset-0 bg-white flex">
          <div
            :class="[
              'p-8 overflow-y-auto transition-all duration-300',
              isPropertyPickerOpen ? 'w-full md:w-[60%] border-r border-gray-100' : (selectedProperty ? 'w-[calc(100%-3rem)] border-r border-gray-100' : 'w-full')
            ]"
          >
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-2xl font-bold text-gray-900">Add Income Record</h3>
              <button @click="isIncomeModalOpen = false; resetIncomeForm()" class="p-2 hover:bg-gray-100 rounded-full">
                <X class="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form @submit.prevent="addIncome" class="space-y-5">
              <div class="space-y-2">
                <label class="text-sm font-semibold text-gray-700">Property</label>
                <button
                  type="button"
                  @click="isPropertyPickerOpen = true"
                  class="w-full px-4 py-2 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition-colors"
                >
                  <span class="font-semibold text-gray-900">
                    {{ selectedProperty ? 'Change Property' : 'Select Property' }}
                  </span>
                  <p class="text-sm text-gray-500 mt-1" v-if="selectedProperty">
                    {{ selectedProperty.address }}, {{ selectedProperty.city }}
                  </p>
                  <p class="text-sm text-gray-500 mt-1" v-else>
                    Select Property
                  </p>
                </button>
              </div>

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
                <textarea v-model="newIncome.description" required class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"></textarea>
              </div>
              <div class="flex justify-end gap-3 pt-2">
                <button type="button" @click="isIncomeModalOpen = false; resetIncomeForm()" class="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Income</button>
              </div>
            </form>
          </div>

          <div
            :class="[
              'relative transition-all duration-300 overflow-hidden',
              isPropertyPickerOpen ? 'w-full md:w-[40%] opacity-100 border-l border-gray-100' : (selectedProperty ? 'w-12 opacity-70 border-l border-gray-100' : 'w-0 opacity-0 border-0')
            ]"
          >
            <div v-if="isPropertyPickerOpen" class="h-full bg-gray-50 p-4 flex flex-col">
              <div class="space-y-3">
                <div class="relative">
                  <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    v-model="propertySearchQuery"
                    type="text"
                    placeholder="Search name, tenant, address, city, state, type..."
                    class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div class="mt-4 space-y-3 overflow-y-auto">
                <div v-for="property in filteredProperties" :key="property.id" class="bg-white rounded-lg border border-gray-200 p-4">
                  <p class="font-bold text-gray-900">{{ property.name }}</p>
                  <p class="text-sm text-gray-600 mt-1">{{ property.address }}, {{ property.city }}, {{ property.state }}</p>
                  <div class="flex items-center text-xs text-gray-500 mt-2 gap-2">
                    <MapPin class="w-3 h-3" />
                    <span>{{ property.property_type }}</span>
                    <User class="w-3 h-3 ml-2" />
                    <span>{{ property.tenant_name }}</span>
                  </div>
                  <button
                    @click="selectProperty(property)"
                    class="mt-3 w-full py-2 rounded-lg text-sm font-semibold transition-colors"
                    :class="selectedProperty?.id === property.id ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'"
                  >
                    {{ selectedProperty?.id === property.id ? 'Selected' : 'Select Property' }}
                  </button>
                </div>
                <p v-if="filteredProperties.length === 0" class="text-sm text-center text-gray-500 py-6">No matching properties.</p>
              </div>
            </div>
            <button
              v-else-if="selectedProperty"
              type="button"
              @click="isPropertyPickerOpen = true"
              class="h-full w-full bg-gray-100/70 hover:bg-gray-100 transition-colors flex items-center justify-center"
            >
              <ChevronRight class="w-6 h-6 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
