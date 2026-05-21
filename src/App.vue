<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMainStore } from '@/stores/mainStore'
import { Toaster } from 'vue-sonner'
import {
  RiDashboardLine,
  RiMapPinLine,
  RiLayoutMasonryLine,
  RiTableAltLine,
  RiLayoutGridLine,
  RiCalendarEventLine,
  RiHistoryLine,
  RiSettings3Line,
  RiArrowUpSLine,
  RiSearchLine,
  RiMenuFoldLine,
  RiMenuUnfoldLine,
  RiRefreshLine,
  RiUserLine,
  RiKeyLine,
  RiBuildingLine,
  RiShieldUserLine
} from 'vue-remix-icons'

const router = useRouter()
const route = useRoute()
const store = useMainStore()

onMounted(async () => {
  await store.loadAllData()
})

const isSidebarHidden = computed(() => {
  const customerMode = store.currentPersona.id === 'customer'
  return customerMode && route.name !== 'customer-booking' && route.name !== 'floor-plan'
})

const isSidebarMinimized = ref(localStorage.getItem('mejaaa_sidebar_minimized') === 'true')
const toggleSidebar = () => {
  isSidebarMinimized.value = !isSidebarMinimized.value
  localStorage.setItem('mejaaa_sidebar_minimized', isSidebarMinimized.value)
}

const isAdmin = computed(() => ['owner', 'admin', 'manager'].includes(store.currentPersona.id))
const isStaff = computed(() => ['host', 'waiter', 'cleaner'].includes(store.currentPersona.id))
const canManageMeja = computed(() => isAdmin.value || isStaff.value)

const isCustomer = computed(() => {
  return store.currentPersona.id === 'customer'
})

const pageTitle = computed(() => {
  if (!route.name) return ''
  const name = String(route.name).toLowerCase()
  switch (name) {
    case 'dashboard': return 'DASBOR UTAMA'
    case 'rooms': return 'RUANGAN & LANTAI'
    case 'tables': return 'MANAJEMEN MEJA'
    case 'bookings': return 'DAFTAR RESERVASI'
    case 'settings': return 'PENGATURAN SISTEM'
    case 'floor-plan': return 'DENAH MEJA'
    case 'customer-booking': return 'RESERVASI TAMU'
    case 'audit-logs': return 'LOG AKTIVITAS'
    case 'users': return 'MANAJEMEN PENGGUNA'
    case 'roles': return 'MANAJEMEN PERAN'
    case 'organizations': return 'STRUKTUR ORGANISASI'
    case 'organization-access': return 'AKSES ORGANISASI'
    default: return String(route.name).toUpperCase()
  }
})

const pendingBookingsCount = computed(() => {
  return store.bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length
})

const navigate = (name) => {
  router.push({ name })
}

const showPersonaDropdown = ref(false)

const togglePersonaDropdown = (e) => {
  if (e) e.stopPropagation()
  showPersonaDropdown.value = !showPersonaDropdown.value
}

const selectPersona = (id) => {
  store.setPersona(id)
  showPersonaDropdown.value = false
  if (id === 'customer') {
    navigate('floor-plan')
  } else {
    navigate('dashboard')
  }
}
</script>

<template>
  <Toaster position="top-center" richColors />
  <div class="app-shell" @click="showPersonaDropdown = false">
    <!-- SIDEBAR -->
    <aside class="sidebar" id="sidebar" v-if="!isCustomer" :class="{ 'minimized': isSidebarMinimized }">
      <div class="sidebar-logo">
        <div class="logo-icon">M</div>
        <span class="logo-text">Mejaaa</span>
      </div>
      <nav class="sidebar-nav">
        <div class="sidebar-section">
          <div class="sidebar-section-label">Ringkasan</div>
          <a class="nav-item" :class="{ active: route.name === 'dashboard' }" @click="navigate('dashboard')" :title="isSidebarMinimized ? 'Dasbor' : null">
            <RiDashboardLine size="18" />
            <span class="nav-text">Dasbor</span>
          </a>
          <a class="nav-item" :class="{ active: route.name === 'customer-booking' }" @click="navigate('customer-booking')" v-if="isCustomer" :title="isSidebarMinimized ? 'Pesan Meja' : null">
            <RiTableAltLine size="18" />
            <span class="nav-text">Pesan Meja</span>
          </a>
        </div>
        <div class="sidebar-section" v-if="canManageMeja">
          <div class="sidebar-section-label">Manajemen</div>
          <a class="nav-item" :class="{ active: route.name === 'rooms' }" @click="navigate('rooms')" v-if="isAdmin" :title="isSidebarMinimized ? 'Ruangan' : null">
            <RiLayoutMasonryLine size="18" />
            <span class="nav-text">Ruangan</span>
          </a>
          <a class="nav-item" :class="{ active: route.name === 'tables' || route.name === 'floor-plan' }" @click="navigate('tables')" :title="isSidebarMinimized ? 'Meja' : null">
            <RiTableAltLine size="18" />
            <span class="nav-text">Meja</span>
          </a>
          <a class="nav-item" :class="{ active: route.name === 'bookings' }" @click="navigate('bookings')" :title="isSidebarMinimized ? 'Reservasi' : null">
            <RiCalendarEventLine size="18" />
            <span class="nav-text">Reservasi</span>
            <span class="nav-badge" v-if="pendingBookingsCount > 0">{{ pendingBookingsCount }}</span>
          </a>
        </div>
        <div class="sidebar-section" v-if="isAdmin">
          <div class="sidebar-section-label">Autentikasi</div>
          <a class="nav-item" :class="{ active: route.name === 'organizations' }" @click="navigate('organizations')" :title="isSidebarMinimized ? 'Organisasi' : null">
            <RiBuildingLine size="18" />
            <span class="nav-text">Organisasi</span>
          </a>
          <a class="nav-item" :class="{ active: route.name === 'organization-access' }" @click="navigate('organization-access')" :title="isSidebarMinimized ? 'Akses Organisasi' : null">
            <RiShieldUserLine size="18" />
            <span class="nav-text">Akses Organisasi</span>
          </a>
          <a class="nav-item" :class="{ active: route.name === 'roles' }" @click="navigate('roles')" :title="isSidebarMinimized ? 'Peran' : null">
            <RiKeyLine size="18" />
            <span class="nav-text">Peran</span>
          </a>
          <a class="nav-item" :class="{ active: route.name === 'users' }" @click="navigate('users')" :title="isSidebarMinimized ? 'Pengguna' : null">
            <RiUserLine size="18" />
            <span class="nav-text">Pengguna</span>
          </a>
        </div>
        <div class="sidebar-section" v-if="isAdmin">
          <div class="sidebar-section-label">Sistem</div>
          <a class="nav-item" :class="{ active: route.name === 'audit-logs' }" @click="navigate('audit-logs')" :title="isSidebarMinimized ? 'Log Aktivitas' : null">
            <RiHistoryLine size="18" />
            <span class="nav-text">Log Aktivitas</span>
          </a>
          <a class="nav-item" :class="{ active: route.name === 'settings' }" @click="navigate('settings')" :title="isSidebarMinimized ? 'Pengaturan' : null">
            <RiSettings3Line size="18" />
            <span class="nav-text">Pengaturan</span>
          </a>
        </div>
      </nav>
      <div class="sidebar-footer dropdown-container" @click="togglePersonaDropdown" style="cursor:pointer;position:relative" :title="isSidebarMinimized ? 'Ganti Persona (' + store.currentPersona.name + ')' : null">
        <div class="avatar" id="current-avatar">{{ store.currentPersona.initials }}</div>
        <div class="user-info">
          <div class="user-name" id="current-user-name">{{ store.currentPersona.name }}</div>
          <div class="user-role" id="current-user-role">{{ store.currentPersona.role }}</div>
        </div>
        <RiArrowUpSLine class="persona-dropdown-icon" style="color: #71717A; width: 16px; height: 16px;" />
        <div class="dropdown-menu" :class="{ open: showPersonaDropdown }" style="bottom:100%;left:0;margin-bottom:8px">
          <div v-for="p in store.personas" :key="p.id" class="dropdown-item" :class="{ active: p.id === store.currentPersona.id }" @click="selectPersona(p.id)">
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar" style="width:24px;height:24px;font-size:10px">{{ p.initials }}</div>
              <div><div style="line-height:1.2">{{ p.name }}</div><div style="font-size:10px;color:var(--text-muted)">{{ p.role }}</div></div>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- MAIN CONTENT -->
    <div class="main-content">
      <header class="topbar" v-if="!isCustomer">
        <div class="topbar-left">
          <button class="btn btn-ghost btn-icon" style="margin-right: 8px; color: var(--text-secondary);" @click="toggleSidebar">
            <RiMenuUnfoldLine v-if="isSidebarMinimized" size="18" />
            <RiMenuFoldLine v-else size="18" />
          </button>
          <span class="topbar-title">{{ pageTitle }}</span>
        </div>
        <div class="topbar-right">
          <button class="btn btn-secondary btn-icon" @click="store.loadAllData()" title="Muat Ulang Data">
            <RiRefreshLine size="16" :style="{ animation: store.isLoading ? 'spin 1s linear infinite' : 'none' }" />
          </button>
          <div class="search-bar" style="width:220px">
            <RiSearchLine size="16" />
            <input class="form-input" type="text" v-model="store.globalSearchQuery" placeholder="Search..." style="font-size:12px;padding:6px 12px 6px 32px">
          </div>
        </div>
      </header>
      <div class="page-content" id="page-content">
        <router-view></router-view>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
