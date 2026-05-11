<script setup>
import { onMounted } from 'vue'
import { useMainStore } from '@/stores/mainStore'
import FloorPlan from './FloorPlan.vue'

const store = useMainStore()

onMounted(() => {
  store.setPersona('customer')
})
</script>

<template>
  <FloorPlan />
</template>
