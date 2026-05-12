<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '@/stores/mainStore'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { toast } from 'vue-sonner'
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiLayoutMasonryLine } from 'vue-remix-icons'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const rooms = computed(() => store.rooms)
const filteredRooms = computed(() => {
  let res = store.rooms
  if (store.globalSearchQuery) {
    const q = store.globalSearchQuery.toLowerCase()
    res = res.filter(r => r.name.toLowerCase().includes(q) || r.type.toLowerCase().includes(q))
  }
  return res
})

const showModal = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const formData = ref({
  name: '',
  type: 'indoor',
  floor_number: 1,
  status: 'active',
  description: ''
})

function tableCount(roomId) {
  return store.tables.filter(t => t.room_id === roomId).length
}

function openModal(room = null) {
  if (room) {
    isEdit.value = true
    currentId.value = room.id
    formData.value = { ...room }
  } else {
    isEdit.value = false
    currentId.value = null
    formData.value = { name: '', type: 'indoor', floor_number: 1, status: 'active', description: '' }
  }
  showModal.value = true
}

async function saveRoom() {
  if (!formData.value.name.trim()) {
    toast.error('Nama ruangan wajib diisi')
    return
  }
  
  if (isEdit.value) {
    await store.updateRoom(currentId.value, formData.value)
    toast.success('Ruangan diperbarui')
  } else {
    await store.createRoom(formData.value)
    toast.success('Ruangan dibuat')
  }
  showModal.value = false
}

async function deleteRoom(id) {
  if (confirm('Apakah Anda yakin ingin menghapus ruangan ini?')) {
    const res = await store.deleteRoom(id)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Ruangan dihapus')
    }
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiLayoutMasonryLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom:8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Ruangan &amp; Lantai</span>
            <span class="page-count-badge">{{ filteredRooms.length }}</span>
          </div>
          <div class="page-subtitle">Kelola area restoran Anda</div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openModal(null)">
        <RiAddLine size="16" style="margin-right: 4px;" /> Tambah Ruangan
      </button>
    </div>
    
    <div class="card">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Nama</th><th>Tipe</th><th>Lantai</th><th>Meja</th><th>Status</th><th style="width:100px">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 4" :key="'skel-'+i">
                <td><BaseSkeleton width="120px" /></td>
                <td><BaseSkeleton width="80px" /></td>
                <td><BaseSkeleton width="40px" /></td>
                <td><BaseSkeleton width="80px" /></td>
                <td><BaseSkeleton width="90px" borderRadius="12px" /></td>
                <td><BaseSkeleton width="60px" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredRooms.length === 0">
                <td colspan="6">
                  <div class="empty-state">
                    <img src="@/assets/No foldres found.svg" alt="Empty" style="width: 120px; margin-bottom: 16px; opacity: 0.8">
                    <h3>Belum ada ruangan</h3>
                  </div>
                </td>
              </tr>
              <tr v-for="r in filteredRooms" :key="r.id">
                <td><strong>{{ r.name }}</strong></td>
                <td style="text-transform:capitalize">{{ r.type }}</td>
                <td>{{ r.floor_number }}</td>
                <td>{{ tableCount(r.id) }} meja</td>
                <td><span class="badge" :class="'badge-' + r.status">{{ r.status }}</span></td>
                <td>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-ghost btn-sm btn-icon" @click="openModal(r)" title="Edit"><RiPencilLine size="14" /></button>
                    <button class="btn btn-ghost btn-sm btn-icon" @click="deleteRoom(r.id)" title="Hapus"><RiDeleteBinLine size="14" /></button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form Ruangan -->
    <BaseModal v-model="showModal" :title="isEdit ? 'Edit Ruangan' : 'Buat Ruangan'">
      <div class="form-group">
        <label class="form-label">Nama Ruangan *</label>
        <input class="form-input" v-model="formData.name" placeholder="cth. Aula Utama">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Tipe</label>
          <select class="form-select" v-model="formData.type">
            <option v-for="t in ['indoor','outdoor','vip','bar','private','other']" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Lantai</label>
          <input class="form-input" type="number" v-model.number="formData.floor_number" min="1">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" v-model="formData.status">
          <option v-for="s in ['active','inactive','maintenance']" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsi</label>
        <textarea class="form-textarea" v-model="formData.description" placeholder="Deskripsi opsional"></textarea>
      </div>
      
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="showModal = false">Batal</button>
        <button type="button" class="btn btn-primary" @click="saveRoom">Simpan</button>
      </template>
    </BaseModal>
  </div>
</template>
