<script setup>
const props = defineProps({
  settings: Object,
})

const emit = defineEmits(['update:settings'])

function update(key, value) {
  emit('update:settings', { ...props.settings, [key]: value })
}
</script>

<template>
  <div class="bg-slate-800/50 rounded-xl p-4 space-y-4">
    <h2 class="text-lg font-bold text-white">Settings</h2>

    <div>
      <label class="text-sm text-slate-300 block mb-1">Red threshold (minutes)</label>
      <input
        type="range"
        min="1"
        max="20"
        :value="settings.redThresholdMinutes"
        @input="update('redThresholdMinutes', parseInt($event.target.value))"
        class="w-full accent-red-500"
      />
      <span class="text-sm text-slate-400">{{ settings.redThresholdMinutes }} min</span>
    </div>

    <div class="flex items-center justify-between">
      <label class="text-sm text-slate-300">Vibrate on red</label>
      <button
        @click="update('enableVibration', !settings.enableVibration)"
        :class="settings.enableVibration ? 'bg-green-600' : 'bg-slate-600'"
        class="w-12 h-6 rounded-full relative transition-colors"
      >
        <span
          :class="settings.enableVibration ? 'translate-x-6' : 'translate-x-0.5'"
          class="block w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5"
        />
      </button>
    </div>

    <div class="flex items-center justify-between">
      <label class="text-sm text-slate-300">Sound on red</label>
      <button
        @click="update('enableSound', !settings.enableSound)"
        :class="settings.enableSound ? 'bg-green-600' : 'bg-slate-600'"
        class="w-12 h-6 rounded-full relative transition-colors"
      >
        <span
          :class="settings.enableSound ? 'translate-x-6' : 'translate-x-0.5'"
          class="block w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5"
        />
      </button>
    </div>

    <div class="flex items-center justify-between">
      <label class="text-sm text-slate-300">Equal play time suggestions</label>
      <button
        @click="update('equalPlayTime', !settings.equalPlayTime)"
        :class="settings.equalPlayTime ? 'bg-green-600' : 'bg-slate-600'"
        class="w-12 h-6 rounded-full relative transition-colors"
      >
        <span
          :class="settings.equalPlayTime ? 'translate-x-6' : 'translate-x-0.5'"
          class="block w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5"
        />
      </button>
    </div>
  </div>
</template>
