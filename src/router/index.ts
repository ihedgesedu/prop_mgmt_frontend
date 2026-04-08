import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/views/Dashboard.vue';
import Properties from '@/views/Properties.vue';
import PropertyDetail from '@/views/PropertyDetail.vue';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
  },
  {
    path: '/properties',
    name: 'Properties',
    component: Properties,
  },
  {
    path: '/properties/:id',
    name: 'PropertyDetail',
    component: PropertyDetail,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
