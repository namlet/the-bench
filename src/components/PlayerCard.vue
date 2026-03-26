<script setup>
import { computed } from 'vue'
import { getPlayerColor, formatTime } from '../utils/color.js'

const props = defineProps({
  player: Object,
  stintMs: { type: Number, default: 0 },
  totalFieldTime: { type: Number, default: 0 },
  totalBenchTime: { type: Number, default: 0 },
  lastFieldStintMs: { type: Number, default: 0 },
  location: { type: String, default: 'bench' },
  thresholdMinutes: { type: Number, default: 7 },
  gameActive: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const colorInfo = computed(() => {
  if (!props.gameActive) {
    return { color: 'hsl(210, 70%, 50%)', isFullRed: false }
  }
  return getPlayerColor({
    location: props.location,
    stintMs: props.stintMs,
    lastFieldStintMs: props.lastFieldStintMs,
    thresholdMinutes: props.thresholdMinutes,
  })
})

const stintFormatted = computed(() => formatTime(props.stintMs))
const fieldTimeFormatted = computed(() => formatTime(props.totalFieldTime))
const benchTimeFormatted = computed(() => formatTime(props.totalBenchTime))
</script>

<template>
  <div
    class="rounded-xl px-3 py-2 cursor-grab active:cursor-grabbing transition-colors duration-300 touch-manipulation"
    :class="{ 'flash-red': colorInfo.isFullRed }"
    :style="{ backgroundColor: colorInfo.color }"
  >
    <div class="flex items-center gap-2">
      <span class="text-white/90 font-bold text-lg min-w-[2rem] text-center">
        {{ player.jerseyNumber }}
      </span>
      <span class="text-white font-semibold text-sm truncate flex-1">
        {{ player.name }}
      </span>
      <span v-if="gameActive" class="text-white/80 text-xs font-mono tabular-nums">
        {{ stintFormatted }}
      </span>
    </div>
    <div v-if="gameActive && !compact" class="flex gap-3 mt-1 text-[10px] text-white/60 font-mono tabular-nums">
      <span>Field {{ fieldTimeFormatted }}</span>
      <span>Bench {{ benchTimeFormatted }}</span>
    </div>
  </div>
</template>
