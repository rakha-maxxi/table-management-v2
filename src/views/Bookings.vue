<script setup>
import { useMainStore } from '@/stores/mainStore'
import { computed } from 'vue'
import { RiCalendarEventLine } from 'vue-remix-icons'

const store = useMainStore()
const bookings = computed(() => store.bookings)
import { toast } from 'vue-sonner'

const isAdmin = computed(() => ['owner', 'admin', 'manager', 'host'].includes(store.currentPersonaId))

async function quickStatusChange(id, newStatus) {
  await store.updateBooking(id, { status: newStatus })
  toast.success('Status reservasi diperbarui')
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID')
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiCalendarEventLine />
        </div>
        <div>
          <div class="page-title-wrap">
            <span class="page-title">Reservasi</span>
            <span class="page-count-badge">{{ bookings.length }}</span>
          </div>
          <div class="page-subtitle">Kelola semua pemesanan meja</div>
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
            <tr v-if="bookings.length === 0">
              <td colspan="6"><div class="empty-state"><h3>Belum ada reservasi</h3></div></td>
            </tr>
            <tr v-for="b in bookings" :key="b.id">
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
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
