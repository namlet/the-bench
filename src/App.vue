<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { useGameState } from './composables/useGameState.js'
import FieldColumn from './components/FieldColumn.vue'
import BenchColumn from './components/BenchColumn.vue'
import GameControls from './components/GameControls.vue'
import TeamManager from './components/TeamManager.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import GameHistory from './components/GameHistory.vue'

const game = useGameState()

const currentView = ref('game') // 'game', 'roster', 'settings', 'history'
const menuOpen = ref(false)
const showShare = ref(false)
const appUrl = 'https://managethebench.netlify.app'
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
    <header class="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2 sticky top-0 z-20">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-white tracking-tight">The Bench</h1>
        <button
          @click="menuOpen = !menuOpen"
          class="text-slate-300 hover:text-white p-1 transition-colors"
        >
          <svg v-if="!menuOpen" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <nav
        v-if="menuOpen"
        class="mt-2 flex flex-col gap-1"
      >
        <button
          v-for="tab in [
            { key: 'game', label: 'Game' },
            { key: 'roster', label: 'Teams' },
            { key: 'history', label: 'History' },
            { key: 'settings', label: 'Settings' },
          ]"
          :key="tab.key"
          @click="currentView = tab.key; menuOpen = false"
          :class="currentView === tab.key
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-700/50'"
          class="px-4 py-2 rounded-lg text-sm font-medium text-left transition-colors"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>
    <!-- Backdrop to close menu -->
    <div
      v-if="menuOpen"
      @click="menuOpen = false"
      class="fixed inset-0 z-10"
    />

    <!-- Main content -->
    <main class="flex-1 p-3">
      <!-- Game View -->
      <div v-if="currentView === 'game'" class="flex flex-col gap-3 h-full">
        <!-- Pre-game: team selector + start button, centered -->
        <div v-if="!game.gameActive.value" class="flex-1 flex flex-col items-center justify-center py-4">
          <!-- Team selector on game page -->
          <div v-if="game.teams.value.length" class="mb-4 w-full max-w-sm">
            <div class="text-xs text-slate-400 uppercase tracking-wider mb-2 px-1">Select Team</div>
            <div class="space-y-1">
              <button
                v-for="team in game.teams.value"
                :key="team.id"
                @click="game.setActiveTeam(team.id)"
                :class="team.id === game.activeTeamId.value
                  ? 'bg-blue-600/30 border-blue-500/50'
                  : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50'"
                class="w-full flex items-center justify-between rounded-lg px-4 py-3 border transition-colors"
              >
                <span class="text-white text-sm font-medium">{{ team.name }}</span>
                <span class="text-slate-400 text-xs">{{ team.players.length }} players</span>
              </button>
            </div>
          </div>

          <div class="w-full max-w-sm">
            <div v-if="!game.teams.value.length" class="text-center text-slate-500 text-sm">
              <p>Create a team in the Teams menu to get started.</p>
            </div>
            <div v-else-if="!game.activeTeam.value" class="text-center text-slate-500 text-sm">
              <p>Select a team above.</p>
            </div>
            <div v-else-if="game.roster.value.length === 0" class="text-center text-slate-500 text-sm">
              <p>Add players to {{ game.activeTeam.value.name }} in the Teams menu.</p>
            </div>
            <button
              v-else
              @click="game.startGame"
              class="w-full bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
            >
              Start Game
            </button>
          </div>

          <!-- Share button -->
          <button
            @click="showShare = true"
            class="mt-6 text-slate-400 hover:text-white text-sm transition-colors"
          >
            Share this app
          </button>
        </div>

        <!-- Active game: controls + field/bench -->
        <template v-else>
          <GameControls
            :gameActive="game.gameActive.value"
            :gamePaused="game.gamePaused.value"
            :isHalftime="game.isHalftime.value"
            :rosterSize="game.activeTeam.value ? game.roster.value.length : 0"
            :swapSuggestions="swapSuggestions"
            :gameElapsedMs="gameElapsedMs()"
            @start="game.startGame"
            @pause="game.pauseGame"
            @resume="game.resumeGame"
            @halftime="game.halftime"
            @end="game.endGame"
          />

          <div class="grid grid-cols-2 gap-3 flex-1">
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
        </template>
      </div>

      <!-- Roster View -->
      <div v-if="currentView === 'roster'">
        <TeamManager
          :teams="game.teams.value"
          :activeTeamId="game.activeTeamId.value"
          :roster="game.roster.value"
          :gameActive="game.gameActive.value"
          @add-team="game.addTeam"
          @update-team="game.updateTeam"
          @remove-team="game.removeTeam"
          @set-active-team="game.setActiveTeam"
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

    <!-- Share QR overlay -->
    <div
      v-if="showShare"
      @click="showShare = false"
      class="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 p-8"
    >
      <h2 class="text-2xl font-bold text-slate-800">The Bench</h2>
      <QrcodeVue :value="appUrl" :size="250" level="M" />
      <p class="text-slate-600 text-sm text-center">Scan to open the app</p>
      <p class="text-blue-600 text-xs">{{ appUrl }}</p>
      <button
        @click.stop="showShare = false"
        class="mt-4 bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-medium"
      >
        Close
      </button>
    </div>
  </div>
</template>
