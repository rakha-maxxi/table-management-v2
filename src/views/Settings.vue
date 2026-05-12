<script setup>
import { useMainStore } from '@/stores/mainStore'
import { toast } from 'vue-sonner'
import { RiDownloadLine, RiSettings3Line } from 'vue-remix-icons'
import { ref, computed, watch } from 'vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)

const hasAccess = computed(() => ['owner', 'admin'].includes(store.currentPersonaId))

// State for settings
const appSettings = ref({
  restaurantName: store.settings?.restaurantName || 'Mejaaa Resto',
  openTime: store.settings?.openTime || '10:00',
  closeTime: store.settings?.closeTime || '22:00',
  defaultDuration: store.settings?.defaultDuration || 90,
  bufferTime: store.settings?.bufferTime || 15,
  gracePeriod: store.settings?.gracePeriod || 15,
  cleaningDuration: store.settings?.cleaningDuration || 10
})

// Auto-save logic with debounce to prevent spamming the API
let saveTimeout;
watch(appSettings, (newVal) => {
  if (!hasAccess.value) return; // double check permission

  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    await store.updateSettings(newVal);
    toast.success('Pengaturan berhasil disimpan');
  }, 1000); // 1-second debounce
}, { deep: true });

const exportData = async () => {
  await store.exportData()
  toast.success('Data berhasil diekspor')
}

const resetData = async () => {
  if (confirm('Atur ulang semua data ke default demo?')) {
    await store.resetData()
    toast.success('Data diatur ulang ke default')
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiSettings3Line />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom:8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Pengaturan</span>
          </div>
          <div class="page-subtitle">Konfigurasi aplikasi</div>
        </div>
      </div>
    </div>

    <!-- Skeleton Body -->
    <div v-if="isLoading" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div class="card" v-for="i in 4" :key="'skel-card-'+i" style="padding: 24px;">
         <BaseSkeleton width="180px" height="20px" style="margin-bottom: 24px;" />
         <BaseSkeleton width="100%" height="36px" style="margin-bottom: 16px;" />
         <BaseSkeleton width="100%" height="36px" />
      </div>
    </div>
    
    <!-- Actual Body -->
    <div v-else>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="card">
        <div class="card-header"><span class="card-title">Pengaturan Restoran</span></div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">Nama Restoran</label>
            <input class="form-input" v-model="appSettings.restaurantName" :disabled="!hasAccess">
          </div>
          <div style="display:flex;gap:12px;">
            <div class="form-group" style="flex:1;">
              <label class="form-label">Jam Buka</label>
              <input class="form-input" type="time" v-model="appSettings.openTime" :disabled="!hasAccess">
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label">Jam Tutup</label>
              <input class="form-input" type="time" v-model="appSettings.closeTime" :disabled="!hasAccess">
            </div>
          </div>
          <p v-if="hasAccess" style="font-size:12px;color:var(--text-muted);margin-top:8px">Pengaturan disimpan secara otomatis.</p>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Manajemen Data</span></div>
        <div class="card-body">
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">Semua data dikelola melalui backend dan database. Anda dapat mengekspor atau mengatur ulang ke data demo.</p>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" @click="exportData">
              <RiDownloadLine size="16" style="margin-right: 4px;" /> Ekspor JSON
            </button>
            <button class="btn btn-danger" @click="resetData" :disabled="!hasAccess">Atur Ulang Data</button>
          </div>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <div class="card-header"><span class="card-title">Aturan Reservasi</span></div>
        <div class="card-body">
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Durasi Default (mnt) <span class="tooltip-icon" data-tooltip="Waktu standar yang dialokasikan untuk reservasi baru (mis. 90 menit).">?</span></label><input type="number" class="form-input" v-model.number="appSettings.defaultDuration" :disabled="!hasAccess"></div>
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Waktu Jeda (mnt) <span class="tooltip-icon" data-tooltip="Waktu jeda setelah reservasi selesai sebelum meja bisa dipesan lagi.">?</span></label><input type="number" class="form-input" v-model.number="appSettings.bufferTime" :disabled="!hasAccess"></div>
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Waktu Toleransi (mnt) <span class="tooltip-icon" data-tooltip="Waktu toleransi keterlambatan sebelum tamu ditandai sebagai Tidak Hadir.">?</span></label><input type="number" class="form-input" v-model.number="appSettings.gracePeriod" :disabled="!hasAccess"></div>
          <div class="form-group"><label class="form-label" style="display:flex;align-items:center;">Durasi Pembersihan (mnt) <span class="tooltip-icon" data-tooltip="Waktu yang dibutuhkan untuk membersihkan meja setelah tamu pergi.">?</span></label><input type="number" class="form-input" v-model.number="appSettings.cleaningDuration" :disabled="!hasAccess"></div>
          <p v-if="hasAccess" style="font-size:12px;color:var(--text-muted);margin-top:8px">Pengaturan disimpan secara otomatis.</p>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header"><span class="card-title">Tentang Mejaaa</span></div>
      <div class="card-body">
        <p style="font-size:13px;color:var(--text-secondary);line-height:1.6"><strong>Mejaaa</strong> adalah sistem manajemen meja restoran untuk denah lantai, pemesanan, dan pelacakan status waktu nyata. Dibangun dengan Vue 3, Tailwind CSS, dan Pinia. Data kini tersambung ke backend Fastify & SQLite.</p>
        <p style="font-size:12px;color:var(--text-muted);margin-top:8px">Versi 2.0 · API Integration</p>
      </div>
    </div>
    </div>
  </div>
</template>
