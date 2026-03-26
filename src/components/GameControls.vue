<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  gameActive: Boolean,
  gamePaused: Boolean,
  isHalftime: Boolean,
  rosterSize: Number,
  swapSuggestions: { type: Array, default: () => [] },
  gameElapsedMs: { type: Number, default: 0 },
})

const emit = defineEmits(['start', 'pause', 'resume', 'halftime', 'end'])

const showEndConfirm = ref(false)

const gameTimeFormatted = computed(() => {
  const ms = props.gameElapsedMs
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

function confirmEnd() {
  showEndConfirm.value = true
}

function doEnd() {
  showEndConfirm.value = false
  emit('end')
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Game clock -->
    <div v-if="gameActive" class="text-center">
      <span class="text-2xl font-mono font-bold tabular-nums text-white">
        {{ gameTimeFormatted }}
      </span>
      <span v-if="gamePaused" class="ml-2 text-yellow-400 text-sm font-semibold">
        {{ isHalftime ? 'HALFTIME' : 'PAUSED' }}
      </span>
    </div>

    <!-- Buttons -->
    <div class="flex gap-2 justify-center flex-wrap">
      <template v-if="gameActive">
        <button
          v-if="!gamePaused"
          @click="$emit('pause')"
          class="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Pause
        </button>
        <button
          v-if="gamePaused"
          @click="$emit('resume')"
          class="bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Resume
        </button>
        <button
          v-if="!gamePaused"
          @click="$emit('halftime')"
          class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Halftime
        </button>
        <button
          @click="confirmEnd"
          class="bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          End Game
        </button>
      </template>
    </div>

    <!-- End game confirmation -->
    <div v-if="showEndConfirm" class="bg-red-900/50 border border-red-700 rounded-lg p-3 text-center">
      <p class="text-sm text-red-200 mb-2">End game and save results?</p>
      <div class="flex gap-2 justify-center">
        <button @click="doEnd" class="bg-red-600 text-white px-4 py-1 rounded text-sm">Yes, End</button>
        <button @click="showEndConfirm = false" class="bg-slate-600 text-white px-4 py-1 rounded text-sm">Cancel</button>
      </div>
    </div>

    <!-- Halftime swap suggestions -->
    <div v-if="isHalftime && swapSuggestions.length" class="bg-blue-900/40 border border-blue-700/50 rounded-lg p-3">
      <p class="text-xs font-semibold text-blue-300 mb-2">Suggested Swaps</p>
      <div v-for="swap in swapSuggestions" :key="swap.out.id" class="text-xs text-blue-200 mb-1">
        <span class="text-red-300">#{{ swap.out.jerseyNumber }} {{ swap.out.name }}</span>
        <span class="mx-1 text-blue-400">&rarr;</span>
        <span class="text-green-300">#{{ swap.in.jerseyNumber }} {{ swap.in.name }}</span>
      </div>
    </div>
  </div>
</template>
