<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '@/stores/mainStore'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import FloorPlan from './FloorPlan.vue'
import { toast } from 'vue-sonner'
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiTableAltLine, RiListUnordered, RiLayoutGridLine } from 'vue-remix-icons'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const tables = computed(() => store.tables)
const rooms = computed(() => store.rooms)

const viewMode = ref('list') // 'list' or 'floor'
const filterRoom = ref('')
const filterStatus = ref('')

const filteredTables = computed(() => {
  let res = tables.value
  if (filterRoom.value) res = res.filter(t => t.room_id === filterRoom.value)
  if (filterStatus.value) res = res.filter(t => t.status === filterStatus.value)
  if (store.globalSearchQuery) {
    const q = store.globalSearchQuery.toLowerCase()
    res = res.filter(t => t.code.toLowerCase().includes(q) || t.shape.toLowerCase().includes(q))
  }
  return res
})

function roomName(id) {
  const r = rooms.value.find(r => r.id === id)
  return r ? r.name : 'Unknown'
}

function roomCount(id) {
  if (!id) return tables.value.length
  return tables.value.filter(t => t.room_id === id).length
}

function statusCount(status) {
  if (!status) return tables.value.length
  return tables.value.filter(t => t.status === status).length
}

const showModal = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const formData = ref({
  code: '',
  room_id: '',
  shape: 'square',
  chair_count: 4,
  capacity_min: 2,
  capacity_max: 4,
  notes: ''
})

function openModal(table = null) {
  if (table) {
    isEdit.value = true
    currentId.value = table.id
    formData.value = { ...table }
  } else {
    isEdit.value = false
    currentId.value = null
    formData.value = { code: '', room_id: rooms.value.length ? rooms.value[0].id : '', shape: 'square', chair_count: 4, capacity_min: 2, capacity_max: 4, notes: '' }
  }
  showModal.value = true
}

async function saveTable(e) {
  if (e) e.preventDefault()
  try {
    const codeSafe = String(formData.value.code || '').trim()
    if (!codeSafe || !formData.value.room_id) {
      toast.error('Kode dan ruangan wajib diisi')
      return
    }
    
    const finalData = { ...formData.value, code: codeSafe }
    
    if (isEdit.value) {
      await store.updateTable(currentId.value, finalData)
      toast.success('Meja berhasil diperbarui')
    } else {
      await store.createTable(finalData)
      toast.success('Meja berhasil dibuat')
    }
    showModal.value = false
  } catch (err) {
    console.error(err)
    toast.error('Terjadi kesalahan: ' + err.message)
  }
}

async function deleteTable(id) {
  if (confirm('Apakah Anda yakin ingin menghapus meja ini?')) {
    const res = await store.deleteTable(id)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Meja berhasil dihapus')
    }
  }
}

const isAdmin = computed(() => ['owner', 'admin', 'manager'].includes(store.currentPersonaId))

async function quickStatusChange(id, newStatus) {
  await store.updateTable(id, { status: newStatus })
  toast.success('Status meja diperbarui')
}
</script>

<template>
  <div>
    <div class="page-header" style="margin-bottom: 12px;">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiTableAltLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom:8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Manajemen Meja</span>
            <span class="page-count-badge">{{ filteredTables.length }}</span>
          </div>
          <div class="page-subtitle">Kelola layout dan daftar meja makan</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <div class="segmented-control">
          <div class="seg-item" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'"><RiListUnordered size="16" />Daftar</div>
          <div class="seg-item" :class="{ active: viewMode === 'floor' }" @click="viewMode = 'floor'"><RiLayoutGridLine size="16" />Denah</div>
        </div>
        <button class="btn btn-primary" @click="openModal(null)" v-if="isAdmin">
          <RiAddLine size="16" style="margin-right: 4px;" /> Tambah Meja
        </button>
      </div>
    </div>

    <div v-if="viewMode === 'list'">
      <div class="filter-bar" style="margin-bottom: 16px; background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-lg); border: 1px solid var(--border-default);">
        <select class="form-select" v-model="filterRoom" style="width:180px; font-size:12px">
          <option value="">Semua Ruangan ({{ roomCount('') }})</option>
          <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }} ({{ roomCount(r.id) }})</option>
        </select>
        <select class="form-select" v-model="filterStatus" style="width:160px; font-size:12px">
          <option value="">Semua Status ({{ statusCount('') }})</option>
          <option value="available">Tersedia ({{ statusCount('available') }})</option>
          <option value="occupied">Terisi ({{ statusCount('occupied') }})</option>
          <option value="reserved">Dipesan ({{ statusCount('reserved') }})</option>
          <option value="cleaning">Dibersihkan ({{ statusCount('cleaning') }})</option>
          <option value="blocked">Diblokir ({{ statusCount('blocked') }})</option>
          <option value="out_of_service">Rusak ({{ statusCount('out_of_service') }})</option>
        </select>
      </div>
      
      <div class="card">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kode</th><th>Ruangan</th><th>Bentuk</th><th>Kursi</th><th>Kapasitas</th><th>Status</th><th>Catatan</th><th style="width:120px" v-if="isAdmin">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 6" :key="'skel-'+i">
                <td><BaseSkeleton width="50px" /></td>
                <td><BaseSkeleton width="120px" /></td>
                <td><BaseSkeleton width="80px" /></td>
                <td><BaseSkeleton width="40px" /></td>
                <td><BaseSkeleton width="40px" /></td>
                <td><BaseSkeleton width="110px" borderRadius="12px" /></td>
                <td><BaseSkeleton width="100px" /></td>
                <td v-if="isAdmin"><BaseSkeleton width="60px" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredTables.length === 0">
                <td colspan="8">
                  <div class="empty-state">
                    <img src="@/assets/No datas found.svg" alt="Empty" style="width: 120px; margin-bottom: 16px; opacity: 0.8">
                    <h3>Tidak ada meja</h3>
                  </div>
                </td>
              </tr>
              <tr v-for="t in filteredTables" :key="t.id">
                <td><strong>{{ t.code }}</strong></td>
                <td>{{ roomName(t.room_id) }}</td>
                <td style="text-transform:capitalize">{{ t.shape }}</td>
                <td>{{ t.chair_count }}</td>
                <td>{{ t.capacity_min }}-{{ t.capacity_max }}</td>
                <td>
                  <select class="form-select" :value="t.status" @change="e => quickStatusChange(t.id, e.target.value)" style="padding:4px 6px;font-size:11px;width:110px">
                    <option value="available">Tersedia</option>
                    <option value="occupied">Terisi</option>
                    <option value="reserved">Dipesan</option>
                    <option value="cleaning">Dibersihkan</option>
                    <option value="blocked">Diblokir</option>
                    <option value="out_of_service">Rusak</option>
                  </select>
                </td>
                <td style="font-size:12px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis">{{ t.notes || '-' }}</td>
                <td v-if="isAdmin">
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm btn-icon" @click="openModal(t)" title="Edit"><RiPencilLine size="14" /></button>
                    <button class="btn btn-ghost btn-sm btn-icon" @click="deleteTable(t.id)" title="Hapus"><RiDeleteBinLine size="14" /></button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      </div>
    </div>

    <div v-else-if="viewMode === 'floor'">
      <FloorPlan :is-embed="true" />
    </div>

    <!-- Modal Form Meja -->
    <BaseModal v-model="showModal" :title="isEdit ? 'Edit Meja' : 'Buat Meja'">
      <div style="display: flex; gap: 24px;">
        
        <!-- Left: Form -->
        <div style="flex: 1;">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Kode Meja *</label>
              <input class="form-input" v-model="formData.code" placeholder="cth. A01">
            </div>
            <div class="form-group">
              <label class="form-label">Ruangan *</label>
              <select class="form-select" v-model="formData.room_id">
                <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Bentuk</label>
              <select class="form-select" v-model="formData.shape">
                <option value="square">Persegi</option>
                <option value="round">Bundar</option>
                <option value="rectangle">Persegi Panjang</option>
                <option value="oval">Oval</option>
                <option value="booth">Booth</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Kursi</label>
              <input class="form-input" type="number" v-model.number="formData.chair_count" min="1">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Kap. Min</label>
              <input class="form-input" type="number" v-model.number="formData.capacity_min" min="1">
            </div>
            <div class="form-group">
              <label class="form-label">Kap. Maks</label>
              <input class="form-input" type="number" v-model.number="formData.capacity_max" min="1">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Catatan</label>
            <textarea class="form-textarea" v-model="formData.notes" placeholder="Catatan internal"></textarea>
          </div>
        </div>

        <!-- Right: Visualizer -->
        <div style="width: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-tertiary); border-radius: var(--radius-md); padding: 16px; border: 1px solid var(--border-default);">
          <span style="font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.5px;">Pratinjau Meja</span>
          
          <div class="floor-table" 
               :data-shape="formData.shape" 
               data-status="available"
               :style="{
                 position: 'relative',
                 width: formData.shape === 'rectangle' ? '120px' : '80px',
                 height: formData.shape === 'rectangle' ? '60px' : '80px',
                 display: 'flex',
                 flexDirection: 'column',
                 alignItems: 'center',
                 justifyContent: 'center',
                 boxShadow: 'var(--shadow-md)'
               }">
            <span class="table-code" style="color:#fff; font-weight:700; font-size:12px; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">{{ formData.code || '?' }}</span>
            <span class="table-chairs" style="color:rgba(255,255,255,0.85); font-size:10px;">{{ formData.chair_count || 0 }} kursi</span>
          </div>
        </div>
        
      </div>
      
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="showModal = false">Batal</button>
        <button type="button" class="btn btn-primary" @click="saveTable">Simpan</button>
      </template>
    </BaseModal>
  </div>
</template>
