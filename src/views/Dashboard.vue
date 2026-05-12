<script setup>
import { useMainStore } from '@/stores/mainStore'
import { computed } from 'vue'
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiAlertLine,
  RiPulseLine,
  RiDashboardLine
} from 'vue-remix-icons'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const restaurantSettings = computed(() => store.settings)

// Time logic for Open/Close status
import { ref, onMounted, onUnmounted } from 'vue'
const currentTime = ref(new Date())
let timeInterval = null

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 60000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})

const isRestaurantOpen = computed(() => {
  const openStr = restaurantSettings.value.openTime || '10:00'
  const closeStr = restaurantSettings.value.closeTime || '22:00'
  
  const now = currentTime.value
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  const [openH, openM] = openStr.split(':').map(Number)
  const openMinutes = openH * 60 + openM
  
  const [closeH, closeM] = closeStr.split(':').map(Number)
  const closeMinutes = closeH * 60 + closeM
  
  if (closeMinutes < openMinutes) {
    // Crosses midnight
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes
  }
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes
})

// KPI Calculations
const totalTables = computed(() => store.tables.length)
const availableCount = computed(() => store.tables.filter(t => t.status === 'available').length)
const reservedCount = computed(() => store.tables.filter(t => t.status === 'reserved').length)
const occupiedCount = computed(() => store.tables.filter(t => t.status === 'occupied').length)
const cleaningCount = computed(() => store.tables.filter(t => t.status === 'cleaning').length)

const todayStr = new Date().toISOString().split('T')[0]
const todayBookings = computed(() => store.bookings.filter(b => b.booking_date === todayStr))
const waitingListCount = computed(() => todayBookings.value.filter(b => !b.assigned_table_id && ['confirmed', 'pending'].includes(b.status)).length)

// Rooms Overview
const roomStatus = computed(() => {
  return store.rooms.map(r => {
    const rTables = store.tables.filter(t => t.room_id === r.id)
    return {
      id: r.id,
      name: r.name,
      total: rTables.length,
      available: rTables.filter(t => t.status === 'available').length,
      occupied: rTables.filter(t => t.status === 'occupied').length,
      reserved: rTables.filter(t => t.status === 'reserved').length,
      cleaning: rTables.filter(t => t.status === 'cleaning').length
    }
  })
})

// Next Bookings
const nextBookings = computed(() => {
  const active = todayBookings.value.filter(b => ['confirmed', 'pending', 'seated'].includes(b.status))
  return active.sort((a, b) => a.start_time.localeCompare(b.start_time)).slice(0, 5)
})

function getTableName(id) {
  if (!id) return '-'
  const t = store.tables.find(x => x.id === id)
  return t ? t.code : '-'
}

// Activity Log
const activityLogs = computed(() => {
  return store.auditLogs.slice(0, 5).map(l => {
    let text = ''
    if (l.action === 'ROOM_UPDATED') text = `Ruangan diperbarui`
    else if (l.action === 'ROOM_CREATED') text = `Ruangan baru dibuat`
    else if (l.action === 'TABLE_MOVED') text = `Meja dipindahkan`
    else if (l.action === 'TABLE_CREATED') text = `Meja baru ditambahkan`
    else if (l.action === 'USER_ROLE_CHANGED') text = `Masuk sebagai ${l.new_value?.role}`
    else if (l.action === 'TABLE_STATUS_CHANGED') text = `Status meja berubah ke ${l.new_value?.status}`
    else if (l.action === 'BOOKING_CREATED') text = `Booking baru dari ${l.new_value?.channel || 'Sistem'}`
    else text = `Aktivitas operasional`
    
    return { ...l, displayText: text }
  })
})

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

// Alerts
const alerts = computed(() => {
  const list = []
  if (waitingListCount.value > 0) {
    list.push({ 
      id: 'waitlist',
      type: 'warning', 
      title: 'Booking Menunggu',
      text: `Terdapat <strong>${waitingListCount.value} booking</strong> yang belum diberikan alokasi meja.` 
    })
  }
  const longCleaning = store.tables.filter(t => t.status === 'cleaning').length
  if (longCleaning > 0) {
    list.push({ 
      id: 'cleaning',
      type: 'alert', 
      title: 'Pembersihan Meja',
      text: `<strong>${longCleaning} meja</strong> sedang dalam status dibersihkan. Pastikan proses selesai tepat waktu.` 
    })
  }
  return list
})
</script>

<template>
  <div style="padding-bottom: 40px;">
    <!-- HEADER -->
    <div class="page-header" style="margin-bottom: 24px; border-bottom: 1px solid var(--border-default); padding-bottom: 16px;">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiDashboardLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="180px" height="24px" style="margin-bottom:8px" />
          <BaseSkeleton width="220px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">{{ restaurantSettings.restaurantName || 'Command Center' }}</span>
            <span class="page-count-badge">{{ totalTables }}</span>
          </div>
          <div class="page-subtitle">
            Hari ini: {{ restaurantSettings.openTime }} - {{ restaurantSettings.closeTime }} &nbsp;•&nbsp; Status: 
            <span v-if="isRestaurantOpen" style="color:var(--brand-600);font-weight:600">Buka</span>
            <span v-else style="color:#DC2626;font-weight:600">Tutup</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <router-link to="/floor-plan" class="btn btn-secondary">Buka Denah</router-link>
        <router-link to="/bookings" class="btn btn-primary">+ Reservasi</router-link>
      </div>
    </div>
    
    <!-- TOP KPI CARDS -->
    <div class="stat-grid" style="grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px;">
      <template v-if="isLoading">
        <div v-for="i in 6" :key="i" class="stat-card" style="padding: 16px;">
          <BaseSkeleton width="60px" height="12px" style="margin-bottom:12px" />
          <BaseSkeleton width="40px" height="24px" />
        </div>
      </template>
      <template v-else>
        <div class="stat-card" style="padding: 16px;">
          <div class="stat-label" style="display: flex; align-items: center; white-space: nowrap;">
            Tersedia 
            <span class="tooltip-icon" data-tooltip="Jumlah meja yang kosong dan siap digunakan saat ini.">?</span>
          </div>
          <div class="stat-value" style="color:var(--status-available)">{{ availableCount }}<span style="font-size:14px;color:var(--text-muted)">/{{ totalTables }}</span></div>
        </div>
        <div class="stat-card" style="padding: 16px;">
          <div class="stat-label" style="display: flex; align-items: center; white-space: nowrap;">
            Reserved 
            <span class="tooltip-icon" data-tooltip="Meja yang sudah dipesan namun tamu belum tiba.">?</span>
          </div>
          <div class="stat-value" style="color:#2563EB">{{ reservedCount }}</div>
        </div>
        <div class="stat-card" style="padding: 16px;">
          <div class="stat-label" style="display: flex; align-items: center; white-space: nowrap;">
            Terisi 
            <span class="tooltip-icon" data-tooltip="Meja yang sedang digunakan oleh tamu saat ini.">?</span>
          </div>
          <div class="stat-value" style="color:#DC2626">{{ occupiedCount }}</div>
        </div>
        <div class="stat-card" style="padding: 16px;">
          <div class="stat-label" style="display: flex; align-items: center; white-space: nowrap;">
            Cleaning 
            <span class="tooltip-icon" data-tooltip="Meja yang sedang dalam proses pembersihan.">?</span>
          </div>
          <div class="stat-value" style="color:#D97706">{{ cleaningCount }}</div>
        </div>
        <div class="stat-card" style="padding: 16px;">
          <div class="stat-label" style="display: flex; align-items: center; white-space: nowrap;">
            Booking 
            <span class="tooltip-icon" data-tooltip="Total reservasi yang dijadwalkan untuk hari ini.">?</span>
          </div>
          <div class="stat-value">{{ todayBookings.length }}</div>
        </div>
        <div class="stat-card" style="padding: 16px;">
          <div class="stat-label" style="display: flex; align-items: center; white-space: nowrap;">
            Waitlist 
            <span class="tooltip-icon" data-tooltip="Jumlah antrean tamu yang menunggu meja kosong.">?</span>
          </div>
          <div class="stat-value">{{ waitingListCount }}</div>
        </div>
      </template>
    </div>
    
    <!-- OPERATIONAL ALERTS -->
    <div style="margin-bottom: 24px; display: flex; flex-direction: column; gap: 10px;">
      <div v-if="alerts.length === 0" class="ops-banner success">
        <div class="banner-icon">
          <RiCheckboxCircleLine size="20" />
        </div>
        <div class="banner-content">
          <strong>Sistem Normal</strong>
          <span>Semua operasional berjalan lancar. Tidak ada isu yang membutuhkan perhatian khusus.</span>
        </div>
      </div>
      
      <div v-for="alert in alerts" :key="alert.id" class="ops-banner" :class="alert.type">
        <div class="banner-icon">
          <RiErrorWarningLine v-if="alert.type === 'warning'" size="20" />
          <RiAlertLine v-else size="20" />
        </div>
        <div class="banner-content">
          <strong>{{ alert.title }}</strong>
          <span v-html="alert.text"></span>
        </div>
        <router-link :to="alert.id === 'waitlist' ? '/bookings' : '/floor-plan'" class="banner-action">
          Tinjau
        </router-link>
      </div>
    </div>
    
    <!-- MAIN CONTENT -->
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:24px;margin-bottom:24px">
      <!-- Left: Status Ruangan -->
      <div class="card">
        <div class="card-header"><span class="card-title">Status Ruangan</span></div>
        <div class="card-body" style="padding:0">
          <div v-for="r in roomStatus" :key="r.id" style="padding: 16px 20px; border-bottom: 1px solid var(--border-default);">
            <div style="font-weight: 600; margin-bottom: 8px; display: flex; justify-content: space-between;">
              <span>{{ r.name }}</span>
              <span style="font-size:12px; color:var(--text-muted); font-weight:500">{{ r.total }} meja</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 12px; flex-wrap: wrap;">
              <span v-if="r.available"><strong style="color:var(--status-available)">{{ r.available }}</strong> tersedia</span>
              <span v-if="r.occupied"><strong style="color:#DC2626">{{ r.occupied }}</strong> terisi</span>
              <span v-if="r.reserved"><strong style="color:#2563EB">{{ r.reserved }}</strong> reserved</span>
              <span v-if="r.cleaning"><strong style="color:#D97706">{{ r.cleaning }}</strong> cleaning</span>
              <span v-if="r.total === 0" style="color:var(--text-muted)">Kosong</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right: Booking Berikutnya -->
      <div class="card">
        <div class="card-header"><span class="card-title">Booking Berikutnya</span></div>
        <div class="data-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Jam</th><th>Customer</th><th>Pax</th><th>Channel</th><th>Meja</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="nextBookings.length === 0">
                <td colspan="6">
                  <div class="empty-state" style="padding:40px 24px">
                    <img src="@/assets/No calendar found.svg" alt="Empty" style="width: 100px; margin-bottom: 16px; opacity: 0.8">
                    <div style="font-size:14px; font-weight:500; color:var(--text-secondary)">Tidak ada booking hari ini.</div>
                  </div>
                </td>
              </tr>
              <tr v-for="b in nextBookings" :key="b.id">
                <td style="font-weight:600">{{ b.start_time }}</td>
                <td>{{ b.customer_name }}</td>
                <td>{{ b.party_size }}</td>
                <td style="text-transform:capitalize">{{ b.channel }}</td>
                <td>{{ getTableName(b.assigned_table_id) }}</td>
                <td><span class="badge" :class="'badge-' + b.status">{{ b.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- SECONDARY CONTENT -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <!-- Left: Aktivitas Terbaru -->
      <div class="card">
        <div class="card-header"><span class="card-title">Aktivitas Terbaru</span></div>
        <div class="card-body">
          <div v-if="activityLogs.length === 0" class="empty-state" style="padding:40px 20px">
            <img src="@/assets/No task found.svg" alt="Empty" style="width: 100px; margin-bottom: 16px; opacity: 0.8">
            <p>Belum ada aktivitas.</p>
          </div>
          <div class="activity-feed" v-else>
            <div class="activity-item" v-for="log in activityLogs" :key="log.id">
              <div class="activity-icon" style="background:var(--bg-tertiary)">
                <RiPulseLine size="14" />
              </div>
              <div>
                <div class="activity-text"><strong>{{ log.actor_name }}</strong>: <span v-html="log.displayText"></span></div>
                <div class="activity-time">{{ formatTime(log.created_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Right: Sistem Status -->
      <div class="card">
        <div class="card-header"><span class="card-title">Status Sistem</span></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:16px">
          
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">KIOSK & WHATSAPP</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px">
              <span>Kiosk Utama</span><span style="color:var(--status-available);font-weight:600">Online</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>WhatsApp Bot</span><span style="color:var(--status-available);font-weight:600">Aktif</span>
            </div>
          </div>
          
          <div style="height:1px;background:var(--border-default)"></div>
          
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-muted);margin-bottom:8px">SUMBER BOOKING (HARI INI)</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px">
              <span>WhatsApp</span><span style="font-weight:600">{{ todayBookings.filter(b => b.channel === 'whatsapp').length }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px">
              <span>Kiosk</span><span style="font-weight:600">{{ todayBookings.filter(b => b.channel === 'customer_kiosk' || b.channel === 'kiosk').length }}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span>Admin / Walk-in</span><span style="font-weight:600">{{ todayBookings.filter(b => b.channel === 'admin').length }}</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Ops Banner */
.ops-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--radius-md); font-size: 13px; border: 1px solid transparent; background: var(--bg-secondary); box-shadow: var(--shadow-sm); }
.ops-banner .banner-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ops-banner .banner-icon svg { width: 18px; height: 18px; }
.ops-banner .banner-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ops-banner .banner-content strong { font-weight: 600; color: var(--text-primary); }
.ops-banner .banner-content span { color: var(--text-secondary); }
.ops-banner .banner-action { padding: 6px 12px; border-radius: var(--radius-sm); font-weight: 600; font-size: 12px; cursor: pointer; text-decoration: none; transition: background 150ms; }

/* Alert Types */
.ops-banner.success { background: #ECFDF5; border-color: #D1FAE5; }
.ops-banner.success .banner-icon { background: #D1FAE5; color: #059669; }

.ops-banner.warning { background: #EFF6FF; border-color: #DBEAFE; }
.ops-banner.warning .banner-icon { background: #DBEAFE; color: #2563EB; }
.ops-banner.warning .banner-action { background: #2563EB; color: #fff; border: 1px solid #1D4ED8; }
.ops-banner.warning .banner-action:hover { background: #1D4ED8; }

.ops-banner.alert { background: #FFFBEB; border-color: #FEF3C7; }
.ops-banner.alert .banner-icon { background: #FEF3C7; color: #D97706; }
.ops-banner.alert .banner-action { background: #D97706; color: #fff; border: 1px solid #B45309; }
.ops-banner.alert .banner-action:hover { background: #B45309; }

/* Activity Feed */
.activity-feed { display: flex; flex-direction: column; gap: 0; }
.activity-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-default); }
.activity-item:last-child { border-bottom: none; }
.activity-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--text-secondary); }
.activity-icon svg { width: 14px; height: 14px; }
.activity-text { font-size: 13px; color: var(--text-secondary); line-height: 1.4; }
.activity-time { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

@media (max-width: 1024px) {
  .stat-grid { grid-template-columns: repeat(3, 1fr) !important; }
}
@media (max-width: 768px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
  div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
}
</style>
