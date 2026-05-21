<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '@/stores/mainStore'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { toast } from 'vue-sonner'
import {
  RiAddLine,
  RiPencilLine,
  RiDeleteBinLine,
  RiUserLine,
  RiMailLine,
  RiShieldUserLine,
} from 'vue-remix-icons'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const users = computed(() => store.users)

const filteredUsers = computed(() => {
  let res = store.users
  if (store.globalSearchQuery) {
    const q = store.globalSearchQuery.toLowerCase()
    res = res.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }
  return res
})

const showModal = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const formData = ref({
  name: '',
  email: '',
  status: 'active',
})

function getInitials(name) {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function openModal(user = null) {
  if (user) {
    isEdit.value = true
    currentId.value = user.id
    formData.value = { ...user }
  } else {
    isEdit.value = false
    currentId.value = null
    formData.value = { name: '', email: '', status: 'active' }
  }
  showModal.value = true
}

async function saveUser() {
  if (!formData.value.name.trim()) {
    toast.error('Nama wajib diisi')
    return
  }
  if (!formData.value.email.trim()) {
    toast.error('Email wajib diisi')
    return
  }
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.value.email.trim())) {
    toast.error('Format email tidak valid')
    return
  }

  if (isEdit.value) {
    const res = await store.updateUser(currentId.value, formData.value)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Pengguna berhasil diperbarui')
      showModal.value = false
    }
  } else {
    const res = await store.createUser(formData.value)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Pengguna berhasil ditambahkan')
      showModal.value = false
    }
  }
}

async function deleteUser(id) {
  if (
    confirm(
      'Apakah Anda yakin ingin menghapus pengguna ini? Semua pemetaan akses organisasi yang terikat akan dihapus secara otomatis.',
    )
  ) {
    const res = await store.deleteUser(id)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Pengguna berhasil dihapus')
    }
  }
}

async function toggleStatus(user) {
  const newStatus = user.status === 'active' ? 'inactive' : 'active'
  const res = await store.updateUser(user.id, { ...user, status: newStatus })
  if (res && res.error) {
    toast.error(res.error)
  } else {
    toast.success(`Status pengguna diperbarui menjadi ${newStatus}`)
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiUserLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom: 8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Manajemen Pengguna</span>
            <span class="page-count-badge">{{ filteredUsers.length }}</span>
          </div>
          <div class="page-subtitle">Kelola master data pengguna dan perizinan dasar</div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openModal(null)">
        <RiAddLine size="16" style="margin-right: 4px" /> Tambah Pengguna
      </button>
    </div>

    <div class="card">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Pengguna</th>
              <th>Email</th>
              <th>Status</th>
              <th>Terdaftar Pada</th>
              <th style="width: 100px; text-align: center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 4" :key="'skel-' + i">
                <td>
                  <div style="display: flex; align-items: center; gap: 10px">
                    <BaseSkeleton width="32px" height="32px" borderRadius="50%" />
                    <BaseSkeleton width="120px" />
                  </div>
                </td>
                <td><BaseSkeleton width="150px" /></td>
                <td><BaseSkeleton width="70px" borderRadius="12px" /></td>
                <td><BaseSkeleton width="100px" /></td>
                <td><BaseSkeleton width="60px" style="margin: 0 auto" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredUsers.length === 0">
                <td colspan="5">
                  <div class="empty-state" style="padding: 40px 0; text-align: center">
                    <RiShieldUserLine
                      size="48"
                      style="color: var(--text-muted); margin-bottom: 12px; opacity: 0.5"
                    />
                    <h3 style="font-weight: 600; color: var(--text-secondary); margin-bottom: 4px">
                      Tidak ada pengguna ditemukan
                    </h3>
                    <p style="font-size: 13px; color: var(--text-muted)">
                      Coba gunakan kata kunci pencarian yang lain.
                    </p>
                  </div>
                </td>
              </tr>
              <tr v-for="u in filteredUsers" :key="u.id">
                <td>
                  <div style="display: flex; align-items: center; gap: 12px">
                    <div class="user-avatar" :class="{ inactive: u.status !== 'active' }">
                      {{ getInitials(u.name) }}
                    </div>
                    <div>
                      <div style="font-weight: 600; color: var(--text-primary)">{{ u.name }}</div>
                      <div
                        style="
                          font-size: 11px;
                          color: var(--text-muted);
                          text-transform: uppercase;
                          letter-spacing: 0.3px;
                        "
                      >
                        ID: {{ u.id.slice(0, 8) }}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div
                    style="
                      display: flex;
                      align-items: center;
                      gap: 6px;
                      color: var(--text-secondary);
                    "
                  >
                    <RiMailLine size="14" style="color: var(--text-muted); width: 14px; height: 14px; flex-shrink: 0;" />
                    <span>{{ u.email }}</span>
                  </div>
                </td>
                <td>
                  <button
                    class="badge-toggle"
                    @click="toggleStatus(u)"
                    title="Klik untuk mengubah status"
                    style="border: none; background: transparent; cursor: pointer; padding: 0"
                  >
                    <span class="badge" :class="'badge-' + u.status">{{
                      u.status === 'active' ? 'Aktif' : 'Nonaktif'
                    }}</span>
                  </button>
                </td>
                <td>
                  <span style="color: var(--text-secondary); font-size: 13px">
                    {{
                      u.created_at
                        ? new Date(u.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'
                    }}
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 6px; justify-content: center">
                    <button
                      class="btn btn-ghost btn-sm btn-icon"
                      @click="openModal(u)"
                      title="Ubah data pengguna"
                    >
                      <RiPencilLine size="14" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm btn-icon text-danger"
                      @click="deleteUser(u.id)"
                      title="Hapus pengguna"
                    >
                      <RiDeleteBinLine size="14" />
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form User -->
    <BaseModal v-model="showModal" :title="isEdit ? 'Ubah Pengguna' : 'Tambah Pengguna Baru'">
      <div class="form-group">
        <label class="form-label">Nama Lengkap *</label>
        <input
          class="form-input"
          v-model="formData.name"
          placeholder="cth. Rakha Updateda"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label">Alamat Email *</label>
        <input
          class="form-input"
          type="email"
          v-model="formData.email"
          placeholder="cth. rakha@kasirpintar.co.id"
          required
          :disabled="isEdit"
        />
        <span class="form-hint" v-if="isEdit"
          >Alamat email pengguna tidak dapat diubah setelah dibuat.</span
        >
      </div>
      <div class="form-group">
        <label class="form-label">Status Pengguna</label>
        <select class="form-select" v-model="formData.status">
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
      </div>

      <template #footer>
        <button type="button" class="btn btn-secondary" @click="showModal = false">Batal</button>
        <button type="button" class="btn btn-primary" @click="saveUser">Simpan</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand-50);
  color: var(--brand-600);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  border: 1px solid var(--brand-200);
  transition: all 0.2s ease;
}
.user-avatar.inactive {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border-color: var(--border-default);
}
.badge-toggle:hover .badge-active {
  background: #d1fae5;
  color: #047857;
}
.badge-toggle:hover .badge-inactive {
  background: #e4e4e7;
  color: #18181b;
}
.text-danger {
  color: #ef4444 !important;
}
.text-danger:hover {
  background: #fee2e2 !important;
}
</style>
