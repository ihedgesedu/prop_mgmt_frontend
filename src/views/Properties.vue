<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/client';
import { Plus, Search, Building2, MapPin, User, DollarSign, Loader2, Trash2, Edit3, X } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { formatCurrency } from '@/utils/formatters';

const router = useRouter();
const properties = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');
const isModalOpen = ref(false);
const isEditFlyoutOpen = ref(false);
const isConfirmModalOpen = ref(false);
const editingPropertyId = ref<number | null>(null);
const pendingChanges = ref<string[]>([]);

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

const newProperty = ref(defaultPropertyForm());

const fetchProperties = async () => {
  try {
    loading.value = true;
    const response = await apiClient.get('/properties');
    
    // Handle both array and object with properties key
    let rawData = response.data;
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      rawData = rawData.properties || rawData.data || [];
    }
    
    // Ensure each property has an 'id' field and handle potential key variations
    properties.value = (rawData || []).map((p: any) => ({
      ...p,
      id: p.id ?? p.property_id,
      name: p.name ?? p.property_name ?? 'Unnamed Property',
      address: p.address ?? p.property_address ?? p.location ?? 'No Address',
      city: p.city ?? '',
      state: p.state ?? '',
      postal_code: p.postal_code ?? p.zip_code ?? '',
      monthly_rent: p.monthly_rent ?? p.rent ?? p.rent_amount ?? 0,
      tenant_name: p.tenant_name ?? p.tenant ?? p.occupant ?? 'Vacant'
    }));
  } catch (err) {
    console.error('Error fetching properties:', err);
    error.value = 'Failed to load properties.';
  } finally {
    loading.value = false;
  }
};

const addProperty = async () => {
  try {
    const response = await apiClient.post('/properties', newProperty.value);
    const created = {
      ...response.data,
      id: response.data.id ?? response.data.property_id
    };
    properties.value.push(created);
    isModalOpen.value = false;
    newProperty.value = {
      ...defaultPropertyForm()
    };
  } catch (err) {
    console.error('Error adding property:', err);
    alert('Failed to add property. Please check your inputs.');
  }
};

const deleteProperty = async (id: number) => {
  if (!confirm('Are you sure you want to delete this property?')) return;
  try {
    await apiClient.delete(`/properties/${id}`);
    properties.value = properties.value.filter(p => p.id !== id);
  } catch (err) {
    console.error('Error deleting property:', err);
    alert('Failed to delete property.');
  }
};

const filteredProperties = () => {
  if (!searchQuery.value) return properties.value;
  const query = searchQuery.value.toLowerCase();
  return properties.value.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.address.toLowerCase().includes(query) ||
    p.tenant_name.toLowerCase().includes(query)
  );
};

const openEditFlyout = (property: any) => {
  const normalized = {
    name: property.name ?? '',
    address: property.address ?? '',
    city: property.city ?? '',
    state: property.state ?? '',
    postal_code: property.postal_code ?? '',
    property_type: property.property_type ?? 'Apartment',
    tenant_name: property.tenant_name ?? '',
    monthly_rent: Number(property.monthly_rent ?? 0)
  };

  editingPropertyId.value = Number(property.id);
  originalEditProperty.value = { ...normalized };
  editPropertyForm.value = { ...normalized };
  pendingChanges.value = [];
  isConfirmModalOpen.value = false;
  isEditFlyoutOpen.value = true;
};

const closeEditFlyout = () => {
  isEditFlyoutOpen.value = false;
  isConfirmModalOpen.value = false;
  editingPropertyId.value = null;
  pendingChanges.value = [];
};

const toDisplay = (value: string | number) => {
  if (typeof value === 'number') return `${formatCurrency(value)}`;
  return value || '(empty)';
};

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
  if (editingPropertyId.value === null) return;

  const { payload } = buildChanges();
  if (Object.keys(payload).length === 0) {
    isConfirmModalOpen.value = false;
    return;
  }

  try {
    await apiClient.patch(`/properties/${editingPropertyId.value}`, payload);
    const idx = properties.value.findIndex((p) => Number(p.id) === editingPropertyId.value);
    if (idx !== -1) {
      properties.value[idx] = {
        ...properties.value[idx],
        ...payload
      };
    }
    closeEditFlyout();
  } catch (err) {
    console.error('Error updating property:', err);
    alert('Failed to update property.');
  }
};

onMounted(fetchProperties);

const navigateToDetail = (id: any) => {
  console.log('Navigating to property detail with ID:', id);
  if (id === undefined || id === null) {
    console.error('Cannot navigate: ID is missing');
    return;
  }
  router.push(`/properties/${id}`);
};
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex flex-col space-y-2">
        <h2 class="text-3xl font-bold text-gray-900">Properties</h2>
        <p class="text-gray-500">Manage and track all your real estate assets.</p>
      </div>
      <button 
        @click="isModalOpen = true"
        class="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
      >
        <Plus class="w-5 h-5 mr-2" />
        Add Property
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
      <div class="flex-1 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by name, address, or tenant..."
          class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        />
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

    <!-- Empty State -->
    <div v-else-if="filteredProperties().length === 0" class="bg-white p-12 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
      <Building2 class="w-16 h-16 text-gray-300 mb-4" />
      <h3 class="text-lg font-semibold text-gray-900">No properties found</h3>
      <p class="text-gray-500 max-w-xs mx-auto">Try adjusting your search or add a new property to get started.</p>
    </div>

    <!-- Properties Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="property in filteredProperties()" 
        :key="property.id"
        class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
      >
        <!-- Property Image Placeholder -->
        <div class="h-48 bg-gray-100 relative overflow-hidden">
          <img 
            :src="`https://picsum.photos/seed/${property.id}/800/600`" 
            alt="Property"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div class="absolute top-4 right-4 flex space-x-2">
            <button 
              @click.stop="openEditFlyout(property)"
              class="p-2 bg-white/90 backdrop-blur rounded-lg text-gray-500 hover:bg-gray-700 hover:text-white transition-all shadow-sm"
            >
              <Edit3 class="w-4 h-4" />
            </button>
            <button 
              @click.stop="deleteProperty(property.id)"
              class="p-2 bg-white/90 backdrop-blur rounded-lg text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
          <div class="absolute bottom-4 left-4">
            <span class="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">
              {{ property.property_type }}
            </span>
          </div>
        </div>

        <!-- Property Info -->
        <div class="p-6 flex-1 flex flex-col">
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-gray-900 line-clamp-1">{{ property.name }}</h3>
          </div>
          
          <div class="space-y-3 mb-6 flex-1">
            <div class="flex items-center text-sm text-gray-600">
              <MapPin class="w-4 h-4 mr-2 text-gray-400 shrink-0" />
              <span class="truncate">{{ property.address }}, {{ property.city }}</span>
            </div>
            <div class="flex items-center text-sm text-gray-600">
              <User class="w-4 h-4 mr-2 text-gray-400 shrink-0" />
              <span>{{ property.tenant_name }}</span>
            </div>
            <div class="flex items-center text-sm text-gray-600">
              <DollarSign class="w-4 h-4 mr-2 text-gray-400 shrink-0" />
              <span class="font-semibold text-indigo-600">${{ formatCurrency(property.monthly_rent) }}/mo</span>
            </div>
          </div>

          <button 
            @click="navigateToDetail(property.id)"
            class="w-full py-2 bg-gray-50 text-gray-700 font-semibold rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-gray-100"
          >
            View Details
          </button>
        </div>
      </div>
    </div>

    <!-- Add Property Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div class="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h3 class="text-2xl font-bold text-gray-900">Add New Property</h3>
          <button @click="isModalOpen = false" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X class="w-6 h-6 text-gray-400" />
          </button>
        </div>
        
        <form @submit.prevent="addProperty" class="p-8 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Property Name</label>
              <input v-model="newProperty.name" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Sunset Heights" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Property Type</label>
              <select v-model="newProperty.property_type" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option>Apartment</option>
                <option>House</option>
                <option>Commercial</option>
                <option>Industrial</option>
              </select>
            </div>
            <div class="md:col-span-2 space-y-2">
              <label class="text-sm font-semibold text-gray-700">Address</label>
              <input v-model="newProperty.address" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="123 Main St" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">City</label>
              <input v-model="newProperty.city" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-semibold text-gray-700">State</label>
                <input v-model="newProperty.state" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-semibold text-gray-700">Postal Code</label>
                <input v-model="newProperty.postal_code" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Tenant Name</label>
              <input v-model="newProperty.tenant_name" required type="text" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-semibold text-gray-700">Monthly Rent ($)</label>
              <input v-model.number="newProperty.monthly_rent" required type="number" class="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div class="flex justify-end space-x-4 pt-4">
            <button 
              type="button" 
              @click="isModalOpen = false"
              class="px-6 py-2 border border-gray-200 text-gray-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              class="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Save Property
            </button>
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
