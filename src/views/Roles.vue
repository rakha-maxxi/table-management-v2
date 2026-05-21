<script setup>
import { ref, computed } from 'vue'
import { useMainStore } from '@/stores/mainStore'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { toast } from 'vue-sonner'
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiKeyLine, RiShieldLine } from 'vue-remix-icons'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const roles = computed(() => store.roles)

const filteredRoles = computed(() => {
  let res = store.roles
  if (store.globalSearchQuery) {
    const q = store.globalSearchQuery.toLowerCase()
    res = res.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    )
  }
  return res
})

const showModal = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const formData = ref({
  code: '',
  name: '',
  description: '',
})

function openModal(role = null) {
  if (role) {
    isEdit.value = true
    currentId.value = role.id
    formData.value = { ...role }
  } else {
    isEdit.value = false
    currentId.value = null
    formData.value = { code: '', name: '', description: '' }
  }
  showModal.value = true
}

function handleCodeInput(e) {
  // Format code to uppercase alphanumeric and underscores only
  formData.value.code = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')
}

async function saveRole() {
  if (!formData.value.code.trim()) {
    toast.error('Kode peran wajib diisi')
    return
  }
  if (!formData.value.name.trim()) {
    toast.error('Nama peran wajib diisi')
    return
  }

  if (isEdit.value) {
    const res = await store.updateRole(currentId.value, formData.value)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Peran berhasil diperbarui')
      showModal.value = false
    }
  } else {
    const res = await store.createRole(formData.value)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Peran baru berhasil dibuat')
      showModal.value = false
    }
  }
}

async function deleteRole(id) {
  if (
    confirm(
      'Apakah Anda yakin ingin menghapus peran ini? Hubungan akses organisasi yang menggunakan peran ini akan dihapus secara otomatis.',
    )
  ) {
    const res = await store.deleteRole(id)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Peran berhasil dihapus')
    }
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiKeyLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom: 8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Manajemen Peran</span>
            <span class="page-count-badge">{{ filteredRoles.length }}</span>
          </div>
          <div class="page-subtitle">
            Kelola tingkat kewenangan atau jabatan struktural organisasi
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openModal(null)">
        <RiAddLine size="16" style="margin-right: 4px" /> Tambah Peran
      </button>
    </div>

    <div class="card">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 200px">Kode Peran</th>
              <th>Nama Peran</th>
              <th>Deskripsi</th>
              <th>Tanggal Dibuat</th>
              <th style="width: 100px; text-align: center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 3" :key="'skel-' + i">
                <td><BaseSkeleton width="100px" height="24px" borderRadius="4px" /></td>
                <td><BaseSkeleton width="140px" /></td>
                <td><BaseSkeleton width="220px" /></td>
                <td><BaseSkeleton width="100px" /></td>
                <td><BaseSkeleton width="60px" style="margin: 0 auto" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredRoles.length === 0">
                <td colspan="5">
                  <div class="empty-state" style="padding: 40px 0; text-align: center">
                    <RiShieldLine
                      size="48"
                      style="color: var(--text-muted); margin-bottom: 12px; opacity: 0.5"
                    />
                    <h3 style="font-weight: 600; color: var(--text-secondary); margin-bottom: 4px">
                      Tidak ada peran ditemukan
                    </h3>
                    <p style="font-size: 13px; color: var(--text-muted)">
                      Coba buat peran baru terlebih dahulu.
                    </p>
                  </div>
                </td>
              </tr>
              <tr v-for="r in filteredRoles" :key="r.id">
                <td>
                  <code class="role-code-badge">{{ r.code }}</code>
                </td>
                <td>
                  <strong style="color: var(--text-primary)">{{ r.name }}</strong>
                </td>
                <td>
                  <span style="color: var(--text-secondary); font-size: 13px">{{
                    r.description || 'Tidak ada deskripsi'
                  }}</span>
                </td>
                <td>
                  <span style="color: var(--text-secondary); font-size: 13px">
                    {{
                      r.created_at
                        ? new Date(r.created_at).toLocaleDateString('id-ID', {
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
                      @click="openModal(r)"
                      title="Edit peran"
                    >
                      <RiPencilLine size="14" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm btn-icon text-danger"
                      @click="deleteRole(r.id)"
                      title="Hapus peran"
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

    <!-- Modal Form Role -->
    <BaseModal v-model="showModal" :title="isEdit ? 'Ubah Peran' : 'Tambah Peran Baru'">
      <div class="form-group">
        <label class="form-label">Kode Peran *</label>
        <input
          class="form-input"
          v-model="formData.code"
          @input="handleCodeInput"
          placeholder="cth. SUPER_ADMIN"
          required
          :disabled="isEdit"
        />
        <span class="form-hint"
          >Gunakan huruf kapital, angka, dan garis bawah saja. Kode tidak dapat diubah setelah
          dibuat.</span
        >
      </div>
      <div class="form-group">
        <label class="form-label">Nama Peran *</label>
        <input
          class="form-input"
          v-model="formData.name"
          placeholder="cth. Super Administrator"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label">Deskripsi</label>
        <textarea
          class="form-textarea"
          v-model="formData.description"
          placeholder="Jelaskan ruang lingkup hak akses peran ini..."
        ></textarea>
      </div>

      <template #footer>
        <button type="button" class="btn btn-secondary" @click="showModal = false">Batal</button>
        <button type="button" class="btn btn-primary" @click="saveRole">Simpan</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.role-code-badge {
  display: inline-block;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  letter-spacing: 0.5px;
}
.text-danger {
  color: #ef4444 !important;
}
.text-danger:hover {
  background: #fee2e2 !important;
}
</style>
