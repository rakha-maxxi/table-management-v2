<script setup>
import { useMainStore } from '@/stores/mainStore'
import { computed, ref } from 'vue'
import { RiHistoryLine } from 'vue-remix-icons'
import BaseSkeleton from '@/components/ui/BaseSkeleton.vue'

const store = useMainStore()
const isLoading = computed(() => store.isLoading)
const filterAction = ref('')
const filterEntity = ref('')

const logs = computed(() => {
  let res = store.auditLogs
  if (filterAction.value) res = res.filter(l => l.action === filterAction.value)
  if (filterEntity.value) res = res.filter(l => l.entity_type === filterEntity.value)
  if (store.globalSearchQuery) {
    const q = store.globalSearchQuery.toLowerCase()
    res = res.filter(l => 
      l.actor_name?.toLowerCase().includes(q) || 
      l.action?.toLowerCase().includes(q) || 
      l.entity_type?.toLowerCase().includes(q)
    )
  }
  return res
})

const actionCounts = computed(() => {
  const counts = {}
  store.auditLogs.forEach(l => {
    counts[l.action] = (counts[l.action] || 0) + 1
  })
  return counts
})

const entities = ['room', 'table', 'booking', 'user']

const entityCounts = computed(() => {
  const counts = {}
  store.auditLogs.forEach(l => {
    if (l.entity_type) {
      counts[l.entity_type] = (counts[l.entity_type] || 0) + 1
    }
  })
  return counts
})

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('id-ID')
}

function getChanges(l) {
  let changes = '-'
  if (l.old_value && l.new_value && typeof l.old_value === 'object' && typeof l.new_value === 'object') {
    let diffs = []
    for (let k in l.new_value) {
      if (['updated_at', '_deleted'].includes(k)) continue
      if (JSON.stringify(l.old_value[k]) !== JSON.stringify(l.new_value[k])) {
        diffs.push(`${k}: ${l.old_value[k] || 'null'} ➔ ${l.new_value[k] || 'null'}`)
      }
    }
    if (diffs.length) changes = diffs.slice(0, 3).join('<br>')
  } else if (l.action.includes('CREATED') && l.new_value) {
    changes = `<span style="color:var(--brand-700)">Dibuat: ${l.new_value.name || l.new_value.code || l.new_value.booking_code || ''}</span>`
  } else if (l.action.includes('DELETED') && l.old_value) {
    changes = `<span style="color:#DC2626">Dihapus: ${l.old_value.name || l.old_value.code || ''}</span>`
  }
  return changes
}
</script>

<template>
  <div>
    <div class="page-header">
      <div class="page-header-left">
        <div class="page-header-icon">
          <RiHistoryLine />
        </div>
        <div v-if="isLoading">
          <BaseSkeleton width="150px" height="24px" style="margin-bottom:8px" />
          <BaseSkeleton width="250px" height="16px" />
        </div>
        <div v-else>
          <div class="page-title-wrap">
            <span class="page-title">Log Aktivitas</span>
            <span class="page-count-badge">{{ logs.length }}</span>
          </div>
          <div class="page-subtitle">Log aktivitas sistem</div>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <select class="form-select" v-model="filterAction" style="width:180px;padding:6px 10px;font-size:12px">
          <option value="">Semua Aksi ({{ store.auditLogs.length }})</option>
          <option v-for="(count, a) in actionCounts" :key="a" :value="a">{{ a.replace(/_/g, ' ') }} ({{ count }})</option>
        </select>
        <select class="form-select" v-model="filterEntity" style="width:160px;padding:6px 10px;font-size:12px">
          <option value="">Semua Entitas</option>
          <option v-for="e in entities" :key="e" :value="e">{{ e }} ({{ entityCounts[e] || 0 }})</option>
        </select>
      </div>
    </div>
    
    <div class="card">
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Aktor</th>
              <th>Aksi</th>
              <th>Entitas</th>
              <th>Perubahan</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 8" :key="'skel-'+i">
                <td><BaseSkeleton width="120px" /></td>
                <td><BaseSkeleton width="100px" /></td>
                <td><BaseSkeleton width="140px" /></td>
                <td><BaseSkeleton width="80px" /></td>
                <td><BaseSkeleton width="200px" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-if="logs.length === 0">
                <td colspan="5">
                  <div class="empty-state">
                    <img src="@/assets/No task found-1.svg" alt="Empty" style="width: 120px; margin-bottom: 16px; opacity: 0.8">
                    <h3>Belum ada log aktivitas</h3>
                  </div>
                </td>
              </tr>
              <tr v-for="l in logs.slice(0, 100)" :key="l.id">
                <td style="font-size:12px;white-space:nowrap;color:var(--text-muted)">{{ formatTime(l.created_at) }}</td>
                <td><strong>{{ l.actor_name }}</strong></td>
                <td style="font-size:12px;font-weight:600">{{ l.action }}</td>
                <td>{{ l.entity_type }}</td>
                <td style="font-family:monospace;font-size:11px" v-html="getChanges(l)"></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
