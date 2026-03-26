<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useGameState } from './composables/useGameState.js'
import FieldColumn from './components/FieldColumn.vue'
import BenchColumn from './components/BenchColumn.vue'
import GameControls from './components/GameControls.vue'
import TeamManager from './components/TeamManager.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import GameHistory from './components/GameHistory.vue'

const game = useGameState()

const currentView = ref('game') // 'game', 'roster', 'settings', 'history'
const tick = ref(0)

// Force re-render every 500ms for timer updates
let tickInterval = null
onMounted(() => {
  tickInterval = setInterval(() => {
    if (game.gameActive.value && !game.gamePaused.value) {
      tick.value++
      checkAlerts()
    }
  }, 500)
})
onUnmounted(() => clearInterval(tickInterval))

// Alert tracking
const alertedPlayers = ref(new Set())

function checkAlerts() {
  const thresholdMs = game.settings.value.redThresholdMinutes * 60 * 1000
  const allFieldPlayers = [
    ...game.fieldPlayers.value,
    ...(game.goalie.value ? [game.goalie.value] : []),
  ]

  allFieldPlayers.forEach(player => {
    const stint = game.getStintDuration(player.id)
    if (stint >= thresholdMs && !alertedPlayers.value.has(player.id)) {
      alertedPlayers.value.add(player.id)
      if (game.settings.value.enableVibration && navigator.vibrate) {
        navigator.vibrate([200, 100, 200])
      }
    }
  })
}

// Wrappers that use tick to force reactivity
function getStintDuration(id) {
  void tick.value
  return game.getStintDuration(id)
}
function getTotalFieldTime(id) {
  void tick.value
  return game.getTotalFieldTime(id)
}
function getTotalBenchTime(id) {
  void tick.value
  return game.getTotalBenchTime(id)
}
function getLastFieldStintMs(id) {
  void tick.value
  return game.getLastFieldStintMs(id)
}
function gameElapsedMs() {
  void tick.value
  return game.gameElapsedMs()
}

const swapSuggestions = computed(() => {
  void tick.value
  return game.getSwapSuggestions()
})

// Drag and drop event handling — vuedraggable already moves items between arrays,
// so we only record timer/event data here (no array mutation).
function onFieldChange(evt) {
  if (evt.added) {
    game.recordMove(evt.added.element.id, 'field')
    alertedPlayers.value.delete(evt.added.element.id)
  }
}

function onBenchChange(evt) {
  if (evt.added) {
    game.recordMove(evt.added.element.id, 'bench')
    alertedPlayers.value.delete(evt.added.element.id)
  }
}

// Goalie drag: vuedraggable already removed the player from the source list,
// so we just need to update goalie.value and record the move.
function handleDragToGoalie(player) {
  const oldGoalie = game.goalie.value
  if (oldGoalie) {
    game.benchPlayers.value.push(oldGoalie)
    game.recordMove(oldGoalie.id, 'bench')
  }
  game.goalie.value = player
  game.recordMove(player.id, 'field')
  alertedPlayers.value.delete(player.id)
}

function handleDragFromGoalie() {
  // Player was dragged out of goalie slot — vuedraggable added them to the
  // target list already, and the target's change handler recorded the move.
  // We just need to clear goalie.value.
  game.goalie.value = null
}

// Tap-to-move handlers — these do the full array mutation + timer recording.
function handleMoveToField(playerId) {
  game.moveToField(playerId)
  alertedPlayers.value.delete(playerId)
}

function handleMoveToBench(playerId) {
  game.moveToBench(playerId)
  alertedPlayers.value.delete(playerId)
}

function handleSetGoalie(playerId) {
  game.setGoalie(playerId)
  alertedPlayers.value.delete(playerId)
}

function updateSettings(newSettings) {
  game.settings.value = newSettings
}
</script>

<template>
  <div class="flex flex-col min-h-[100dvh]">
    <!-- Header -->
    <header class="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2 sticky top-0 z-10">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-white tracking-tight">The Bench</h1>
        <nav class="flex gap-1">
          <button
            v-for="tab in [
              { key: 'game', label: 'Game' },
              { key: 'roster', label: 'Roster' },
              { key: 'history', label: 'History' },
              { key: 'settings', label: 'Settings' },
            ]"
            :key="tab.key"
            @click="currentView = tab.key"
            :class="currentView === tab.key
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'"
            class="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </header>

    <!-- Main content -->
    <main class="flex-1 p-3">
      <!-- Game View -->
      <div v-if="currentView === 'game'" class="flex flex-col gap-3 h-full">
        <GameControls
          :gameActive="game.gameActive.value"
          :gamePaused="game.gamePaused.value"
          :isHalftime="game.isHalftime.value"
          :rosterSize="game.roster.value.length"
          :swapSuggestions="swapSuggestions"
          :gameElapsedMs="gameElapsedMs()"
          @start="game.startGame"
          @pause="game.pauseGame"
          @resume="game.resumeGame"
          @halftime="game.halftime"
          @end="game.endGame"
        />

        <div v-if="!game.gameActive.value" class="text-center text-slate-500 text-sm py-8">
          <p v-if="game.roster.value.length === 0">Add players in the Roster tab, then start a game.</p>
          <p v-else>Ready! Tap "Start Game" to begin.</p>
        </div>

        <div v-else class="grid grid-cols-2 gap-3 flex-1">
          <FieldColumn
            :fieldPlayers="game.fieldPlayers.value"
            :goalie="game.goalie.value"
            :gameActive="game.gameActive.value"
            :gamePaused="game.gamePaused.value"
            :getStintDuration="getStintDuration"
            :getTotalFieldTime="getTotalFieldTime"
            :getTotalBenchTime="getTotalBenchTime"
            :getLastFieldStintMs="getLastFieldStintMs"
            :thresholdMinutes="game.settings.value.redThresholdMinutes"
            @update:fieldPlayers="game.fieldPlayers.value = $event"
            @move-to-bench="handleMoveToBench"
            @set-goalie="handleSetGoalie"
            @drag-to-goalie="handleDragToGoalie"
            @drag-from-goalie="handleDragFromGoalie"
            @change="onFieldChange"
          />

          <BenchColumn
            :benchPlayers="game.benchPlayers.value"
            :gameActive="game.gameActive.value"
            :gamePaused="game.gamePaused.value"
            :getStintDuration="getStintDuration"
            :getTotalFieldTime="getTotalFieldTime"
            :getTotalBenchTime="getTotalBenchTime"
            :getLastFieldStintMs="getLastFieldStintMs"
            :thresholdMinutes="game.settings.value.redThresholdMinutes"
            @update:benchPlayers="game.benchPlayers.value = $event"
            @move-to-field="handleMoveToField"
            @change="onBenchChange"
          />
        </div>
      </div>

      <!-- Roster View -->
      <div v-if="currentView === 'roster'">
        <TeamManager
          :roster="game.roster.value"
          :gameActive="game.gameActive.value"
          @add="game.addPlayer"
          @update="game.updatePlayer"
          @remove="game.removePlayer"
        />
      </div>

      <!-- History View -->
      <div v-if="currentView === 'history'">
        <GameHistory :history="game.gameHistory.value" />
      </div>

      <!-- Settings View -->
      <div v-if="currentView === 'settings'">
        <SettingsPanel
          :settings="game.settings.value"
          @update:settings="updateSettings"
        />
      </div>
    </main>
  </div>
</template>
