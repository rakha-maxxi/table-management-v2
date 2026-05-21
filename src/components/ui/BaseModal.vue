<script setup>
import { onUnmounted, watch } from 'vue'
import { RiCloseLine } from 'vue-remix-icons'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Modal' }
})

const emit = defineEmits(['update:modelValue'])

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    emit('update:modelValue', false)
  }
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', handleKeyDown)
  } else {
    document.removeEventListener('keydown', handleKeyDown)
  }
}, { immediate: true })

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div class="modal-overlay" :class="{ open: modelValue }" @click="$emit('update:modelValue', false)">
    <div class="modal" @click.stop v-if="modelValue">
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="modal-close" @click="$emit('update:modelValue', false)">
          <RiCloseLine size="18" />
        </button>
      </div>
      <div class="modal-body">
        <slot></slot>
      </div>
      <div class="modal-footer" v-if="$slots.footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>
