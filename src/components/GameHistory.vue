<script setup>
import { ref } from 'vue'
import { formatTime } from '../utils/color.js'

const props = defineProps({
  history: { type: Array, default: () => [] },
})

const expandedId = ref(null)

function toggle(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getPlayerFieldTime(game, playerId) {
  const timer = game.playerTimers[playerId]
  if (!timer) return 0
  return timer.stints.reduce((total, s) => {
    if (s.location !== 'field') return total
    return total + ((s.end || 0) - s.start)
  }, 0)
}

function getPlayerBenchTime(game, playerId) {
  const timer = game.playerTimers[playerId]
  if (!timer) return 0
  return timer.stints.reduce((total, s) => {
    if (s.location !== 'bench') return total
    return total + ((s.end || 0) - s.start)
  }, 0)
}
</script>

<template>
  <div class="bg-slate-800/50 rounded-xl p-4">
    <h2 class="text-lg font-bold text-white mb-3">Game History</h2>

    <div v-if="!history.length" class="text-slate-500 text-sm text-center py-4">
      No games played yet.
    </div>

    <div v-for="game in history" :key="game.id" class="mb-2">
      <button
        @click="toggle(game.id)"
        class="w-full text-left bg-slate-700/30 hover:bg-slate-700/50 rounded-lg px-3 py-2 transition-colors"
      >
        <div class="flex justify-between items-center">
          <span class="text-sm text-white font-medium">{{ formatDate(game.date) }}</span>
          <span class="text-xs text-slate-400">{{ game.roster.length }} players</span>
        </div>
      </button>

      <div v-if="expandedId === game.id" class="mt-1 bg-slate-700/20 rounded-lg p-3 space-y-1">
        <div
          v-for="player in game.roster"
          :key="player.id"
          class="flex items-center gap-2 text-xs"
        >
          <span class="text-blue-400 font-bold min-w-[1.5rem] text-center">{{ player.jerseyNumber }}</span>
          <span class="text-white flex-1 truncate">{{ player.name }}</span>
          <span class="text-green-400 font-mono tabular-nums">F {{ formatTime(getPlayerFieldTime(game, player.id)) }}</span>
          <span class="text-blue-400 font-mono tabular-nums">B {{ formatTime(getPlayerBenchTime(game, player.id)) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
