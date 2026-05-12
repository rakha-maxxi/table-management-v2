<script setup>
import { useMainStore } from '@/stores/mainStore'
import { computed, ref } from 'vue'
import { RiCalendarEventLine, RiSearchLine, RiFilter3Line } from 'vue-remix-icons'
import { toast } from 'vue-sonner'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const isAdmin = computed(() => ['owner', 'admin', 'manager', 'host'].includes(store.currentPersonaId))

// Filter states
const filterDate = ref('')
const filterStatus = ref('')

const filteredBookings = computed(() => {
  return store.bookings.filter(b => {
    // Search Filter
    if (store.globalSearchQuery) {
      const q = store.globalSearchQuery.toLowerCase()
      const matchName = b.customer_name?.toLowerCase().includes(q)
      const matchCode = b.booking_code?.toLowerCase().includes(q)
      if (!matchName && !matchCode) return false
    }

    // Date Filter
    if (filterDate.value) {
      if (b.booking_date !== filterDate.value) return false
    }

    // Status Filter
    if (filterStatus.value) {
      if (b.status !== filterStatus.value) return false
    }

    return true
  }).sort((a, b) => new Date(b.booking_date + 'T' + b.start_time) - new Date(a.booking_date + 'T' + a.start_time))
})

async function quickStatusChange(id, newStatus) {
  await store.updateBooking(id, { status: newStatus })
  toast.success('Status reservasi diperbarui')
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiCalendarEventLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom:8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Reservasi</span>
            <span class="page-count-badge">{{ filteredBookings.length }}</span>
          </div>
          <div class="page-subtitle">Kelola semua pemesanan meja</div>
        </div>
      </div>
      
      <!-- Toolbar Filter -->
      <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="date" class="form-input" v-model="filterDate" style="width: auto;">
          <select class="form-select" v-model="filterStatus" style="width: 150px;">
            <option value="">Semua Status</option>
            <option value="pending">Menunggu</option>
            <option value="confirmed">Terkonfirmasi</option>
            <option value="checked_in">Tiba</option>
            <option value="seated">Duduk</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
            <option value="no_show">Tidak Hadir</option>
          </select>
          <button class="btn btn-secondary btn-icon" @click="filterDate=''; filterStatus=''" title="Reset Filter" v-if="filterDate || filterStatus">
            Reset
          </button>
        </div>
      </div>
    </div>
    
    <div class="card">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kode</th><th>Tamu</th><th>Kontak</th><th>Tanggal & Waktu</th><th>Porsi</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 5" :key="'skel-'+i">
                <td><BaseSkeleton width="80px" /></td>
                <td><BaseSkeleton width="120px" /></td>
                <td><BaseSkeleton width="100px" /></td>
                <td><BaseSkeleton width="150px" /></td>
                <td><BaseSkeleton width="50px" /></td>
                <td><BaseSkeleton width="90px" borderRadius="12px" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredBookings.length === 0">
                <td colspan="6">
                  <div class="empty-state">
                    <img src="@/assets/No search result found.svg" v-if="store.globalSearchQuery || filterDate || filterStatus" alt="Empty" style="width: 120px; margin-bottom: 16px; opacity: 0.8">
                    <img src="@/assets/No calendar found.svg" v-else alt="Empty" style="width: 120px; margin-bottom: 16px; opacity: 0.8">
                    <h3>Tidak ada reservasi ditemukan</h3>
                    <p v-if="store.bookings.length > 0">Coba ubah filter atau kata kunci pencarian Anda.</p>
                  </div>
                </td>
              </tr>
              <tr v-for="b in filteredBookings" :key="b.id">
                <td><strong>{{ b.booking_code }}</strong></td>
                <td>{{ b.customer_name }}</td>
                <td>{{ b.customer_phone }}</td>
                <td>{{ b.booking_date }} <span style="color:var(--text-muted)">{{ b.start_time }}</span></td>
                <td>{{ b.party_size }} org</td>
                <td>
                  <select v-if="isAdmin" class="form-select" :value="b.status" @change="e => quickStatusChange(b.id, e.target.value)" style="padding:4px 6px;font-size:11px;width:130px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); background-color: var(--bg-secondary);">
                    <option value="pending">Menunggu</option>
                    <option value="confirmed">Terkonfirmasi (Approve)</option>
                    <option value="checked_in">Tiba (Kehadiran)</option>
                    <option value="seated">Duduk (Seated)</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                    <option value="no_show">Tidak Hadir</option>
                  </select>
                  <span v-else class="badge" :class="'badge-' + b.status">{{ b.status }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
