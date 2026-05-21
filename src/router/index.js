import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import FloorPlan from '@/views/FloorPlan.vue'
import CustomerBooking from '@/views/CustomerBooking.vue'
import Rooms from '@/views/Rooms.vue'
import Bookings from '@/views/Bookings.vue'
import AuditLogs from '@/views/AuditLogs.vue'
import Settings from '@/views/Settings.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/floor-plan',
      name: 'floor-plan',
      component: FloorPlan
    },
    {
      path: '/customer-booking',
      name: 'customer-booking',
      component: CustomerBooking
    },
    {
      path: '/rooms',
      name: 'rooms',
      component: Rooms
    },
    {
      path: '/tables',
      name: 'tables',
      component: () => import('@/views/Tables.vue')
    },
    {
      path: '/bookings',
      name: 'bookings',
      component: Bookings
    },
    {
      path: '/audit-logs',
      name: 'audit-logs',
      component: AuditLogs
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/Users.vue')
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/Roles.vue')
    },
    {
      path: '/organizations',
      name: 'organizations',
      component: () => import('@/views/Organizations.vue')
    },
    {
      path: '/organization-access',
      name: 'organization-access',
      component: () => import('@/views/OrganizationAccess.vue')
    }
  ]
})

export default router
