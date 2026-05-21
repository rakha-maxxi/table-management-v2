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
  RiBuildingLine,
  RiFolderLine,
  RiArrowRightSLine,
  RiGitBranchLine,
} from 'vue-remix-icons'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const organizations = computed(() => store.organizations)

// Flatten hierarchical tree with recursive depth and full path tracking
const flattenedOrgs = computed(() => {
  const list = store.organizations
  if (!list.length) return []

  const map = {}
  const roots = []

  list.forEach((o) => {
    map[o.id] = { ...o, children: [] }
  })

  list.forEach((o) => {
    if (o.parent_id && map[o.parent_id]) {
      map[o.parent_id].children.push(map[o.id])
    } else {
      roots.push(map[o.id])
    }
  })

  const result = []
  function traverse(node, depth = 0, path = '') {
    const nodePath = path ? `${path} > ${node.name}` : node.name
    result.push({
      ...node,
      depth,
      path: nodePath,
    })
    // Sort children alphabetically by name
    const sortedChildren = [...node.children].sort((a, b) => a.name.localeCompare(b.name))
    sortedChildren.forEach((child) => traverse(child, depth + 1, nodePath))
  }

  // Sort roots alphabetically
  const sortedRoots = [...roots].sort((a, b) => a.name.localeCompare(b.name))
  sortedRoots.forEach((root) => traverse(root, 0, ''))

  return result
})

const filteredOrgs = computed(() => {
  const all = flattenedOrgs.value
  if (!store.globalSearchQuery) return all

  const q = store.globalSearchQuery.toLowerCase()
  return all.filter((o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q))
})

const showModal = ref(false)
const isEdit = ref(false)
const currentId = ref(null)
const formData = ref({
  parent_id: '',
  code: '',
  name: '',
})

function openModal(org = null, defaultParentId = null) {
  if (org) {
    isEdit.value = true
    currentId.value = org.id
    formData.value = {
      parent_id: org.parent_id || '',
      code: org.code,
      name: org.name,
    }
  } else {
    isEdit.value = false
    currentId.value = null
    formData.value = {
      parent_id: defaultParentId || '',
      code: '',
      name: '',
    }
  }
  showModal.value = true
}

function handleCodeInput(e) {
  formData.value.code = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')
}

async function saveOrg() {
  if (!formData.value.code.trim()) {
    toast.error('Kode organisasi wajib diisi')
    return
  }
  if (!formData.value.name.trim()) {
    toast.error('Nama organisasi wajib diisi')
    return
  }

  // Prevent circular parent dependency if editing
  if (isEdit.value && formData.value.parent_id === currentId.value) {
    toast.error('Organisasi tidak dapat menjadi induk bagi dirinya sendiri.')
    return
  }

  const payload = {
    parent_id: formData.value.parent_id || null,
    code: formData.value.code,
    name: formData.value.name,
  }

  if (isEdit.value) {
    const res = await store.updateOrg(currentId.value, payload)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Organisasi berhasil diperbarui')
      showModal.value = false
    }
  } else {
    const res = await store.createOrg(payload)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Organisasi baru berhasil ditambahkan')
      showModal.value = false
    }
  }
}

async function deleteOrg(id) {
  if (
    confirm(
      'Apakah Anda yakin ingin menghapus organisasi ini? Peringatan: Semua sub-organisasi di bawahnya dan hak akses pengguna yang terikat akan dihapus secara permanen (CASCADE DELETE).',
    )
  ) {
    const res = await store.deleteOrg(id)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Organisasi berhasil dihapus')
    }
  }
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiBuildingLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom: 8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Struktur Organisasi</span>
            <span class="page-count-badge">{{ filteredOrgs.length }}</span>
          </div>
          <div class="page-subtitle">
            Kelola pohon hierarki cabang, divisi, dan departemen perusahaan
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openModal(null)">
        <RiAddLine size="16" style="margin-right: 4px" /> Tambah Organisasi Utama
      </button>
    </div>

    <div class="card">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Struktur / Nama Organisasi</th>
              <th style="width: 180px">Kode Org</th>
              <th>Induk</th>
              <th>Tanggal Dibuat</th>
              <th style="width: 140px; text-align: center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 4" :key="'skel-' + i">
                <td>
                  <div style="display: flex; align-items: center; gap: 10px">
                    <BaseSkeleton width="20px" />
                    <BaseSkeleton width="160px" />
                  </div>
                </td>
                <td><BaseSkeleton width="100px" height="24px" borderRadius="4px" /></td>
                <td><BaseSkeleton width="120px" /></td>
                <td><BaseSkeleton width="100px" /></td>
                <td><BaseSkeleton width="100px" style="margin: 0 auto" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="filteredOrgs.length === 0">
                <td colspan="5">
                  <div class="empty-state" style="padding: 40px 0; text-align: center">
                    <RiBuildingLine
                      size="48"
                      style="color: var(--text-muted); margin-bottom: 12px; opacity: 0.5"
                    />
                    <h3 style="font-weight: 600; color: var(--text-secondary); margin-bottom: 4px">
                      Tidak ada organisasi ditemukan
                    </h3>
                    <p style="font-size: 13px; color: var(--text-muted)">
                      Coba gunakan pencarian atau buat organisasi baru.
                    </p>
                  </div>
                </td>
              </tr>
              <tr v-for="o in filteredOrgs" :key="o.id" :class="'depth-row-' + o.depth">
                <td>
                  <div :style="{ paddingLeft: o.depth * 28 + 'px' }" class="org-tree-cell">
                    <!-- Branch graphic indicators -->
                    <span v-if="o.depth > 0" class="branch-connector">
                      <RiGitBranchLine size="14" style="color: var(--text-muted)" />
                    </span>
                    <!-- Node Icon -->
                    <span class="org-icon-wrap" :class="{ 'is-root': o.depth === 0 }">
                      <RiBuildingLine v-if="o.depth === 0" size="14" />
                      <RiFolderLine v-else size="14" />
                    </span>
                    <span class="org-name-text">{{ o.name }}</span>
                  </div>
                </td>
                <td>
                  <code class="org-code-badge">{{ o.code }}</code>
                </td>
                <td>
                  <span
                    v-if="o.parent_id"
                    style="
                      font-size: 12px;
                      color: var(--text-secondary);
                      display: inline-flex;
                      align-items: center;
                      gap: 4px;
                    "
                  >
                    <RiBuildingLine size="12" style="color: var(--text-muted)" />
                    {{
                      flattenedOrgs.find((parent) => parent.id === o.parent_id)?.name ||
                      'Induk Tidak Ditemukan'
                    }}
                  </span>
                  <span v-else class="root-badge">Root</span>
                </td>
                <td>
                  <span style="color: var(--text-secondary); font-size: 13px">
                    {{
                      o.created_at
                        ? new Date(o.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'
                    }}
                  </span>
                </td>
                <td>
                  <div style="display: flex; gap: 4px; justify-content: center">
                    <button
                      class="btn btn-ghost btn-sm btn-icon"
                      @click="openModal(null, o.id)"
                      title="Tambah Sub-departemen"
                    >
                      <RiAddLine size="14" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm btn-icon"
                      @click="openModal(o)"
                      title="Ubah nama/kode organisasi"
                    >
                      <RiPencilLine size="14" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm btn-icon text-danger"
                      @click="deleteOrg(o.id)"
                      title="Hapus organisasi beserta turunannya"
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

    <!-- Modal Form Organisasi -->
    <BaseModal v-model="showModal" :title="isEdit ? 'Ubah Organisasi' : 'Tambah Organisasi'">
      <div class="form-group">
        <label class="form-label">Organisasi Induk</label>
        <select class="form-select" v-model="formData.parent_id">
          <option value="">-- Tanpa Induk (Root Level) --</option>
          <option
            v-for="o in flattenedOrgs.filter((item) => !isEdit || item.id !== currentId)"
            :key="o.id"
            :value="o.id"
          >
            {{ o.path }}
          </option>
        </select>
        <span class="form-hint"
          >Kosongkan jika organisasi ini merupakan tingkat tertinggi (Root).</span
        >
      </div>
      <div class="form-group">
        <label class="form-label">Kode Organisasi *</label>
        <input
          class="form-input"
          v-model="formData.code"
          @input="handleCodeInput"
          placeholder="cth. KPI_MARKETING"
          required
          :disabled="isEdit"
        />
        <span class="form-hint"
          >Kode pengenal unik sistem (Huruf kapital, angka, dan garis bawah). Tidak dapat diubah
          setelah dibuat.</span
        >
      </div>
      <div class="form-group">
        <label class="form-label">Nama Organisasi / Divisi *</label>
        <input
          class="form-input"
          v-model="formData.name"
          placeholder="cth. Departemen Pemasaran"
          required
        />
      </div>

      <template #footer>
        <button type="button" class="btn btn-secondary" @click="showModal = false">Batal</button>
        <button type="button" class="btn btn-primary" @click="saveOrg">Simpan</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.org-tree-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.branch-connector {
  display: flex;
  align-items: center;
  margin-right: -4px;
}
.org-icon-wrap {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
}
.org-icon-wrap.is-root {
  background: var(--brand-50);
  color: var(--brand-600);
  border-color: var(--brand-200);
}
.org-name-text {
  font-weight: 500;
  color: var(--text-primary);
}
.depth-row-0 .org-name-text {
  font-weight: 700;
}
.org-code-badge {
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
.root-badge {
  background: rgba(62, 207, 142, 0.1);
  color: var(--brand-600);
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
  text-transform: uppercase;
}
.text-danger {
  color: #ef4444 !important;
}
.text-danger:hover {
  background: #fee2e2 !important;
}
</style>
