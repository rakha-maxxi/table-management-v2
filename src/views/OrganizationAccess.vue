<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useMainStore } from '@/stores/mainStore'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'
import { toast } from 'vue-sonner'
import { 
  RiShieldUserLine, 
  RiBuildingLine, 
  RiSearchLine, 
  RiUserAddLine, 
  RiCloseLine, 
  RiArrowRightSLine, 
  RiArrowDownSLine, 
  RiFolderLine, 
  RiGitBranchLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiUserLine,
  RiKeyLine
} from 'vue-remix-icons'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)

// State
const selectedOrgId = ref(null)
const includeDescendants = ref(false)
const searchQuery = ref('')
const collapsedOrgs = ref({})

// Assign access form state
const selectedUserId = ref('')
const selectedRoleId = ref('')

// Searchable user dropdown state
const userSearchQuery = ref('')
const showUserDropdown = ref(false)
const selectedUser = computed(() => {
  return store.users.find(u => u.id === selectedUserId.value) || null
})
const filteredUserOptions = computed(() => {
  const q = userSearchQuery.value.toLowerCase()
  return store.users.filter(u => 
    u.status === 'active' && 
    (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  )
})

// Build tree nodes and flatten them with recursive tracking
const treeNodes = computed(() => {
  const list = store.organizations
  if (!list.length) return []

  const map = {}
  const roots = []
  
  list.forEach(o => {
    map[o.id] = { ...o, children: [] }
  })
  
  list.forEach(o => {
    if (o.parent_id && map[o.parent_id]) {
      map[o.parent_id].children.push(map[o.id])
    } else {
      roots.push(map[o.id])
    }
  })
  
  const result = []
  // Keep track of visible nodes based on parent collapse state
  function traverse(node, depth = 0, parentCollapsed = false, isLastChild = true, parentPrefixes = []) {
    const isCollapsed = collapsedOrgs.value[node.id] || false
    const hasChildren = node.children.length > 0
    
    result.push({
      ...node,
      depth,
      hasChildren,
      isCollapsed,
      isLastChild,
      parentPrefixes: [...parentPrefixes],
      hidden: parentCollapsed
    })
    
    const sortedChildren = [...node.children].sort((a, b) => a.name.localeCompare(b.name))
    sortedChildren.forEach((child, idx) => {
      traverse(
        child, 
        depth + 1, 
        parentCollapsed || isCollapsed, 
        idx === sortedChildren.length - 1,
        [...parentPrefixes, isLastChild]
      )
    })
  }
  
  // Sort roots alphabetically
  const sortedRoots = [...roots].sort((a, b) => a.name.localeCompare(b.name))
  sortedRoots.forEach((root, idx) => traverse(root, 0, false, idx === sortedRoots.length - 1, []))
  
  return result
})

// Set active organization on load
onMounted(() => {
  if (store.organizations.length > 0 && !selectedOrgId.value) {
    // Select root if possible, or first available org
    const root = store.organizations.find(o => !o.parent_id)
    selectedOrgId.value = root ? root.id : store.organizations[0].id
  }
})

// Watch organizations load to auto-select if empty previously
watch(() => store.organizations, (newVal) => {
  if (newVal.length > 0 && !selectedOrgId.value) {
    const root = newVal.find(o => !o.parent_id)
    selectedOrgId.value = root ? root.id : newVal[0].id
  }
}, { deep: true })

// Toggle collapse node
function toggleCollapse(orgId, event) {
  if (event) event.stopPropagation()
  collapsedOrgs.value[orgId] = !collapsedOrgs.value[orgId]
}

// Select active node
function selectOrg(orgId) {
  selectedOrgId.value = orgId
}

// Active organization details
const selectedOrg = computed(() => {
  return store.organizations.find(o => o.id === selectedOrgId.value) || null
})

// Selected organization path breadcrumbs
const selectedOrgPath = computed(() => {
  if (!selectedOrg.value) return ''
  
  const pathParts = []
  let current = selectedOrg.value
  
  while (current) {
    pathParts.unshift(current.name)
    current = store.organizations.find(o => o.id === current.parent_id)
  }
  
  return pathParts.join('  ›  ')
})

// Get all descendant organization IDs (recursive)
const currentOrgDescendants = computed(() => {
  if (!selectedOrgId.value) return []
  
  const ids = [selectedOrgId.value]
  const list = store.organizations
  
  function traverse(id) {
    list.filter(o => o.parent_id === id).forEach(child => {
      ids.push(child.id)
      traverse(child.id)
    })
  }
  
  traverse(selectedOrgId.value)
  return ids
})

// Filter access mapping based on active selection, search, and includeDescendants
const filteredAccess = computed(() => {
  if (!selectedOrgId.value) return []
  
  let list = store.organizationAccess
  
  // Filter by organization (with recursive descendants toggle)
  const targetOrgIds = includeDescendants.value 
    ? currentOrgDescendants.value 
    : [selectedOrgId.value]
    
  list = list.filter(oa => targetOrgIds.includes(oa.organization_id))
  
  // Filter by search query
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(oa => 
      oa.user_name.toLowerCase().includes(q) ||
      oa.user_email.toLowerCase().includes(q) ||
      oa.role_name.toLowerCase().includes(q) ||
      oa.organization_name.toLowerCase().includes(q)
    )
  }
  
  return list
})

// Custom searchable select actions
function selectUser(user) {
  selectedUserId.value = user.id
  userSearchQuery.value = user.name
  showUserDropdown.value = false
}

function clearUserSelection() {
  selectedUserId.value = ''
  userSearchQuery.value = ''
}

// Form assignment action
async function assignAccess() {
  if (!selectedOrgId.value) {
    toast.error('Pilih organisasi terlebih dahulu')
    return
  }
  if (!selectedUserId.value) {
    toast.error('Pilih pengguna terlebih dahulu')
    return
  }
  if (!selectedRoleId.value) {
    toast.error('Pilih peran terlebih dahulu')
    return
  }

  const payload = {
    user_id: selectedUserId.value,
    organization_id: selectedOrgId.value,
    role_id: selectedRoleId.value
  }

  const res = await store.createAccess(payload)
  if (res && res.error) {
    toast.error(res.error)
  } else {
    toast.success('Akses organisasi berhasil ditetapkan')
    // Clear user form field only, keep role for quick multiple assigns if needed
    clearUserSelection()
  }
}

// Revoke access action
async function revokeAccess(accessId, userName) {
  if (confirm(`Apakah Anda yakin ingin mencabut hak akses untuk ${userName}?`)) {
    const res = await store.deleteAccess(accessId)
    if (res && res.error) {
      toast.error(res.error)
    } else {
      toast.success('Akses berhasil dicabut')
    }
  }
}
</script>

<template>
  <div class="layer-container">
    <!-- LAYER 2: MIDDLE COLUMN - Organization tree -->
    <div class="org-tree-column">
      <div class="column-header">
        <div class="column-header-icon">
          <RiBuildingLine size="14" />
        </div>
        <span class="column-header-title">Struktur Organisasi</span>
      </div>
      
      <div class="org-tree-wrapper">
        <template v-if="isLoading && store.organizations.length === 0">
          <div style="padding: 12px;">
            <BaseSkeleton v-for="i in 6" :key="i" width="100%" height="28px" style="margin-bottom: 6px;" />
          </div>
        </template>
        <template v-else>
          <div v-if="treeNodes.length === 0" class="empty-tree-state">
            <div class="empty-tree-icon">
              <RiBuildingLine size="20" />
            </div>
            <div style="font-size:12px; color: var(--text-secondary); margin-top: 8px;">Belum ada organisasi</div>
            <div style="font-size:11px; color: var(--text-muted); margin-top: 2px;">Tambahkan di halaman Organisasi</div>
          </div>
          
          <div 
            v-for="node in treeNodes" 
            :key="node.id"
            v-show="!node.hidden"
            class="tree-node"
            :class="{ 'active': selectedOrgId === node.id, 'is-root': node.depth === 0 }"
            :style="{ paddingLeft: (12 + node.depth * 20) + 'px' }"
            @click="selectOrg(node.id)"
          >
            <!-- Expand / Collapse Arrow -->
            <button 
              v-if="node.hasChildren"
              class="collapse-btn"
              @click="toggleCollapse(node.id, $event)"
            >
              <RiArrowDownSLine v-if="!node.isCollapsed" size="14" />
              <RiArrowRightSLine v-else size="14" />
            </button>
            <span v-else class="tree-leaf-spacer"></span>

            <!-- Node Icon -->
            <span class="node-icon" :class="{ 'root-icon': node.depth === 0 }">
              <RiBuildingLine v-if="node.depth === 0" size="13" />
              <RiFolderLine v-else size="13" />
            </span>

            <!-- Node text -->
            <span class="node-name">{{ node.name }}</span>
            <code class="node-badge" v-if="node.code && node.depth === 0">{{ node.code }}</code>
          </div>
        </template>
      </div>
    </div>

    <!-- LAYER 3: RIGHT CONTAINER - Form & Active assignments table -->
    <div class="workspace-column">
      <!-- Breadcrumbs Path -->
      <div class="workspace-path-bar" v-if="selectedOrg">
        <RiBuildingLine size="14" style="color: var(--text-muted); flex-shrink: 0;" />
        <span class="path-value">{{ selectedOrgPath }}</span>
      </div>

      <div class="workspace-scroll-area">
        <div v-if="!selectedOrg" class="select-org-notice">
          <div class="empty-state-icon">
            <RiShieldUserLine size="28" />
          </div>
          <h2>Pilih Organisasi</h2>
          <p>Pilih departemen atau divisi di panel kiri untuk mengelola penetapan akses pengguna.</p>
        </div>

        <div v-else class="dashboard-grid">
          <!-- TOP CARD: Form assign access -->
          <div class="card assign-card">
            <div class="card-header" style="background: var(--bg-secondary); border-bottom: 1px solid var(--border-default);">
              <div style="display:flex; align-items:center; gap:8px;">
                <RiUserAddLine size="15" style="color: var(--brand-500);" />
                <span class="card-title">Tetapkan Akses</span>
              </div>
              <span class="badge badge-available" style="font-size:10px">{{ selectedOrg.name }}</span>
            </div>
            
            <div class="card-body">
              <div class="assign-form-row">
                <!-- Searchable User Dropdown -->
                <div class="form-group custom-select-container">
                  <label class="form-label">Pengguna (User) *</label>
                  <div class="searchable-input-wrapper">
                    <RiUserLine size="14" class="field-icon" />
                    <input 
                      type="text" 
                      class="form-input custom-select-input" 
                      v-model="userSearchQuery" 
                      placeholder="Cari nama atau email..."
                      @focus="showUserDropdown = true"
                      @click="showUserDropdown = true"
                    />
                    <button 
                      v-if="selectedUserId" 
                      type="button" 
                      class="clear-select-btn" 
                      @click="clearUserSelection"
                    >
                      <RiCloseLine size="14" />
                    </button>
                  </div>
                  
                  <!-- Dropdown options -->
                  <div class="custom-dropdown-options" v-if="showUserDropdown">
                    <div class="dropdown-options-header">
                      <span>Daftar Pengguna Aktif</span>
                      <button type="button" @click="showUserDropdown = false"><RiCloseLine size="14" /></button>
                    </div>
                    <div class="options-list-scroll">
                      <div v-if="filteredUserOptions.length === 0" class="no-options-found">
                        Tidak ada pengguna aktif ditemukan
                      </div>
                      <div 
                        v-for="u in filteredUserOptions" 
                        :key="u.id" 
                        class="options-item" 
                        :class="{ 'selected': selectedUserId === u.id }"
                        @click="selectUser(u)"
                      >
                        <div style="display:flex; flex-direction:column;">
                          <span style="font-weight:600; color:var(--text-primary)">{{ u.name }}</span>
                          <span style="font-size:11px; color:var(--text-muted)">{{ u.email }}</span>
                        </div>
                        <RiCheckLine size="14" v-if="selectedUserId === u.id" style="color:var(--brand-500)" />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Role Dropdown -->
                <div class="form-group">
                  <label class="form-label">Peran (Role) *</label>
                  <div style="position:relative">
                    <RiKeyLine size="14" class="field-icon" />
                    <select class="form-select" v-model="selectedRoleId" style="padding-left:36px">
                      <option value="" disabled>Pilih peran...</option>
                      <option v-for="r in store.roles" :key="r.id" :value="r.id">
                        {{ r.name }} ({{ r.code }})
                      </option>
                    </select>
                  </div>
                </div>

                <!-- Assign Button -->
                <div class="form-group btn-align-bottom">
                  <button class="btn btn-primary" style="width:100%; justify-content: center; height:38px" @click="assignAccess">
                    <RiShieldUserLine size="16" /> Tetapkan
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- BOTTOM CARD: Active assignments table -->
          <div class="card table-card">
            <div class="table-card-header">
              <div class="table-header-left">
                <span class="table-title">Pengguna &amp; Akses Terkoneksi</span>
                <span class="page-count-badge">{{ filteredAccess.length }}</span>
              </div>
              
              <div class="table-header-filters">
                <!-- Include descendants checkbox -->
                <label class="descendants-checkbox-label">
                  <input type="checkbox" v-model="includeDescendants" class="custom-checkbox" />
                  <span>Sertakan turunan</span>
                </label>

                <!-- Local Access Table Search -->
                <div class="search-bar" style="width:200px">
                  <RiSearchLine size="14" />
                  <input class="form-input search-filter-input" type="text" v-model="searchQuery" placeholder="Cari pengguna/peran..." style="font-size:12px; padding:6px 12px 6px 32px">
                </div>
              </div>
            </div>

            <div class="data-table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Pengguna</th>
                    <th>Organisasi / Divisi</th>
                    <th>Peran Terikat</th>
                    <th>Waktu Ditetapkan</th>
                    <th style="width:110px; text-align: center;">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-if="isLoading">
                    <tr v-for="i in 3" :key="'skel-'+i">
                      <td><BaseSkeleton width="130px" /></td>
                      <td><BaseSkeleton width="110px" /></td>
                      <td><BaseSkeleton width="100px" height="24px" borderRadius="12px" /></td>
                      <td><BaseSkeleton width="90px" /></td>
                      <td><BaseSkeleton width="80px" style="margin:0 auto" /></td>
                    </tr>
                  </template>
                  <template v-else>
                    <tr v-if="filteredAccess.length === 0">
                      <td colspan="5">
                        <div class="empty-table-state">
                          <div class="empty-table-icon">
                            <RiShieldUserLine size="20" />
                          </div>
                          <h3>Tidak ada hak akses aktif</h3>
                          <p>Gunakan form di atas untuk menetapkan peran pengguna ke organisasi ini.</p>
                        </div>
                      </td>
                    </tr>
                    <tr v-for="oa in filteredAccess" :key="oa.id">
                      <td>
                        <div>
                          <div style="font-weight:600; color:var(--text-primary)">{{ oa.user_name }}</div>
                          <div style="font-size:11px; color:var(--text-muted)">{{ oa.user_email }}</div>
                        </div>
                      </td>
                      <td>
                        <div style="display:flex; align-items:center; gap:6px;">
                          <span style="font-weight:500; color:var(--text-secondary); font-size:12px;">
                            {{ oa.organization_name }}
                          </span>
                          <code style="font-size:10px; opacity:0.7" class="node-badge">{{ oa.organization_code }}</code>
                        </div>
                      </td>
                      <td>
                        <span class="role-badge-connect">
                          <RiKeyLine size="11" style="margin-right:3px" />
                          {{ oa.role_name }}
                        </span>
                      </td>
                      <td>
                        <span style="color: var(--text-secondary); font-size: 12px;">
                          {{ oa.created_at ? new Date(oa.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-' }}
                        </span>
                      </td>
                      <td>
                        <div style="text-align: center;">
                          <button 
                            class="btn btn-danger btn-sm" 
                            style="padding: 4px 10px; font-size: 11px;"
                            @click="revokeAccess(oa.id, oa.user_name)"
                          >
                            <RiDeleteBinLine size="12" /> Lepas Akses
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Constrain all icons to prevent stretching */
.column-header-icon :deep(svg) {
  width: 14px !important;
  height: 14px !important;
  flex-shrink: 0;
}

.empty-tree-icon :deep(svg) {
  width: 20px !important;
  height: 20px !important;
  flex-shrink: 0;
}

.collapse-btn :deep(svg) {
  width: 14px !important;
  height: 14px !important;
  flex-shrink: 0;
}

.node-icon :deep(svg) {
  width: 13px !important;
  height: 13px !important;
  flex-shrink: 0;
}

.workspace-path-bar :deep(svg) {
  width: 14px !important;
  height: 14px !important;
  flex-shrink: 0;
}

.empty-state-icon :deep(svg) {
  width: 28px !important;
  height: 28px !important;
  flex-shrink: 0;
}

/* Sized directly via .field-icon class */

.clear-select-btn :deep(svg) {
  width: 14px !important;
  height: 14px !important;
  flex-shrink: 0;
}

.role-badge-connect :deep(svg) {
  width: 11px !important;
  height: 11px !important;
  flex-shrink: 0;
}

.btn :deep(svg) {
  width: 16px !important;
  height: 16px !important;
  flex-shrink: 0;
}

.empty-table-icon :deep(svg) {
  width: 20px !important;
  height: 20px !important;
  flex-shrink: 0;
}

.layer-container {
  display: flex;
  height: calc(100vh - 104px);
  margin: -24px;
  background: var(--bg-primary);
  overflow: hidden;
}

/* MIDDLE COLUMN (Layer 2) */
.org-tree-column {
  width: 300px;
  min-width: 300px;
  border-right: 1px solid var(--border-default);
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
}

.column-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  gap: 10px;
}

.column-header-icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: rgba(62, 207, 142, 0.1);
  color: var(--brand-500);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.column-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.2px;
}

.org-tree-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 8px 6px;
}

.empty-tree-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
}

.empty-tree-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
}

/* ---- Tree Node ---- */
.tree-node {
  position: relative;
  display: flex;
  align-items: center;
  padding: 6px 10px 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-bottom: 1px;
  transition: all 0.15s ease;
  user-select: none;
  gap: 6px;
}

.tree-node:hover {
  background: var(--bg-tertiary);
}

.tree-node.active {
  background: rgba(62, 207, 142, 0.08);
}

.tree-node.active .node-name {
  font-weight: 600;
  color: var(--brand-700);
}

.tree-node.active .node-icon {
  background: rgba(62, 207, 142, 0.15);
  color: var(--brand-600);
  border-color: rgba(62, 207, 142, 0.25);
}

.collapse-btn {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: all 0.15s;
}

.collapse-btn:hover {
  background: rgba(0,0,0,0.06);
  color: var(--text-primary);
}

.tree-leaf-spacer {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.node-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: 1px solid var(--border-default);
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.node-icon.root-icon {
  background: rgba(62, 207, 142, 0.1);
  color: var(--brand-600);
  border-color: rgba(62, 207, 142, 0.2);
}

.node-name {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  font-weight: 450;
}

.tree-node.is-root .node-name {
  font-weight: 600;
}

.node-badge {
  font-family: monospace;
  font-size: 9px;
  background: var(--bg-tertiary);
  color: var(--text-muted);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-default);
  flex-shrink: 0;
  letter-spacing: 0.3px;
}

.active .node-badge {
  background: rgba(62,207,142,0.1);
  color: var(--brand-600);
  border-color: rgba(62,207,142,0.2);
}

/* WORKSPACE COLUMN (Layer 3) */
.workspace-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  min-width: 0;
}

.workspace-path-bar {
  padding: 10px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.path-value {
  font-weight: 500;
  color: var(--text-secondary);
}

.workspace-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.select-org-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  height: 100%;
  max-width: 360px;
  margin: 0 auto;
  padding-bottom: 80px;
}

.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-lg, 12px);
  background: rgba(62, 207, 142, 0.08);
  color: var(--brand-500);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 1px solid rgba(62, 207, 142, 0.12);
}

.select-org-notice h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.select-org-notice p {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

.dashboard-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.assign-form-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  gap: 16px;
  align-items: flex-end;
}

.btn-align-bottom {
  margin-bottom: 16px;
}

.table-card-header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
}

.table-title {
  font-size: 13px;
  font-weight: 600;
}

.table-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.table-header-filters {
  display: flex;
  align-items: center;
  gap: 16px;
}

.descendants-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox {
  width: 14px;
  height: 14px;
  accent-color: var(--brand-500);
}

.role-badge-connect {
  display: inline-flex;
  align-items: center;
  background: var(--brand-50);
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  border: 1px solid var(--brand-200);
}

/* Empty table state */
.empty-table-state {
  padding: 48px 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-table-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--bg-tertiary);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  border: 1px solid var(--border-default);
}

.empty-table-state h3 {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.empty-table-state p {
  font-size: 13px;
  color: var(--text-muted);
}

/* CUSTOM SEARCHABLE SELECT */
.custom-select-container {
  position: relative;
}

.searchable-input-wrapper {
  position: relative;
}

.field-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
  width: 14px !important;
  height: 14px !important;
  flex-shrink: 0;
}

.custom-select-input {
  padding-left: 36px !important;
  padding-right: 32px !important;
}

.clear-select-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-select-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.custom-dropdown-options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow: hidden;
}

.dropdown-options-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-default);
  background: var(--bg-tertiary);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dropdown-options-header button {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-muted);
}

.dropdown-options-header button:hover {
  color: var(--text-primary);
}

.options-list-scroll {
  flex: 1;
  overflow-y: auto;
}

.no-options-found {
  padding: 16px;
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}

.options-item {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  border-bottom: 1px solid var(--border-default);
  transition: background 0.15s;
}

.options-item:last-child {
  border-bottom: none;
}

.options-item:hover {
  background: var(--bg-tertiary);
}

.options-item.selected {
  background: rgba(62, 207, 142, 0.05);
}

/* RESPONSIVE LAYOUT FOR SMALL SCREEN HEIGHTS OR SMALL WIDTHS */
@media (max-width: 900px) {
  .layer-container {
    flex-direction: column;
    height: auto;
    overflow-y: auto;
  }
  .org-tree-column {
    width: 100%;
    min-width: unset;
    min-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--border-default);
  }
  .assign-form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .btn-align-bottom {
    margin-bottom: 0;
  }
}
</style>
