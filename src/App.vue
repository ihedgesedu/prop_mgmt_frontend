<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { LayoutDashboard, Building2, Settings, Menu, X } from 'lucide-vue-next';
import { ref } from 'vue';

const isSidebarOpen = ref(true);

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex">
    <!-- Sidebar -->
    <aside 
      :class="[
        'bg-white border-r border-gray-200 transition-all duration-300 ease-in-out fixed lg:static inset-y-0 left-0 z-50',
        isSidebarOpen ? 'w-64' : 'w-20'
      ]"
    >
      <div class="h-full flex flex-col">
        <!-- Logo -->
        <div class="h-16 flex items-center px-6 border-b border-gray-100">
          <Building2 class="w-8 h-8 text-indigo-600 shrink-0" />
          <span v-if="isSidebarOpen" class="ml-3 font-bold text-xl text-gray-900 truncate">PropMgmt</span>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 py-6 px-3 space-y-1">
          <RouterLink 
            to="/" 
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group"
            active-class="bg-indigo-50 text-indigo-700"
            :class="[isSidebarOpen ? 'justify-start' : 'justify-center']"
          >
            <LayoutDashboard class="w-5 h-5 shrink-0" />
            <span v-if="isSidebarOpen" class="ml-3">Dashboard</span>
          </RouterLink>

          <RouterLink 
            to="/properties" 
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group"
            active-class="bg-indigo-50 text-indigo-700"
            :class="[isSidebarOpen ? 'justify-start' : 'justify-center']"
          >
            <Building2 class="w-5 h-5 shrink-0" />
            <span v-if="isSidebarOpen" class="ml-3">Properties</span>
          </RouterLink>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-gray-100">
          <button 
            @click="toggleSidebar"
            class="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            :class="[isSidebarOpen ? 'justify-start' : 'justify-center']"
          >
            <Menu v-if="!isSidebarOpen" class="w-5 h-5 shrink-0" />
            <X v-else class="w-5 h-5 shrink-0" />
            <span v-if="isSidebarOpen" class="ml-3">Collapse</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
        <h1 class="text-lg font-semibold text-gray-900">
          {{ $route.name }}
        </h1>
        <div class="flex items-center space-x-4">
          <div class="text-sm text-gray-500">Welcome, Property Manager</div>
          <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
            PM
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <div class="flex-1 overflow-y-auto p-8">
        <RouterView v-slot="{ Component }">
          <transition 
            name="fade" 
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
