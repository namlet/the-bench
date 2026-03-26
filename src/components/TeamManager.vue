<script setup>
import { ref } from 'vue'

const props = defineProps({
  teams: { type: Array, default: () => [] },
  activeTeamId: { type: String, default: null },
  roster: { type: Array, default: () => [] },
  gameActive: Boolean,
})

const emit = defineEmits([
  'add-team', 'update-team', 'remove-team', 'set-active-team',
  'add', 'update', 'remove',
])

// Team form
const showTeamForm = ref(false)
const editingTeamId = ref(null)
const teamName = ref('')

function openAddTeam() {
  editingTeamId.value = null
  teamName.value = ''
  showTeamForm.value = true
}

function openEditTeam(team) {
  editingTeamId.value = team.id
  teamName.value = team.name
  showTeamForm.value = true
}

function saveTeam() {
  if (!teamName.value.trim()) return
  if (editingTeamId.value) {
    emit('update-team', editingTeamId.value, { name: teamName.value.trim() })
  } else {
    emit('add-team', teamName.value.trim())
  }
  showTeamForm.value = false
}

function confirmRemoveTeam(id) {
  emit('remove-team', id)
}

// Player form
const showForm = ref(false)
const editingId = ref(null)
const playerName = ref('')
const jerseyNumber = ref('')

function openAdd() {
  editingId.value = null
  playerName.value = ''
  jerseyNumber.value = ''
  showForm.value = true
}

function openEdit(player) {
  editingId.value = player.id
  playerName.value = player.name
  jerseyNumber.value = player.jerseyNumber.toString()
  showForm.value = true
}

function save() {
  if (!playerName.value.trim() || jerseyNumber.value === '') return

  if (editingId.value) {
    emit('update', editingId.value, {
      name: playerName.value.trim(),
      jerseyNumber: parseInt(jerseyNumber.value),
    })
  } else {
    emit('add', playerName.value.trim(), parseInt(jerseyNumber.value))
  }
  showForm.value = false
}

function remove(id) {
  emit('remove', id)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Team selector -->
    <div class="bg-slate-800/50 rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold text-white">Teams</h2>
        <button
          v-if="!gameActive"
          @click="openAddTeam"
          class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors"
        >
          + New Team
        </button>
      </div>

      <!-- Team form -->
      <div v-if="showTeamForm" class="bg-slate-700/50 rounded-lg p-3 mb-3">
        <input
          v-model="teamName"
          type="text"
          placeholder="Team name"
          class="bg-slate-600 text-white rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          @keyup.enter="saveTeam"
        />
        <div class="flex gap-2">
          <button @click="saveTeam" class="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex-1 transition-colors">
            {{ editingTeamId ? 'Save' : 'Create' }}
          </button>
          <button @click="showTeamForm = false" class="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded-lg text-sm flex-1 transition-colors">
            Cancel
          </button>
        </div>
      </div>

      <!-- Team list -->
      <div class="space-y-1">
        <div
          v-for="team in teams"
          :key="team.id"
          @click="!gameActive && $emit('set-active-team', team.id)"
          :class="team.id === activeTeamId
            ? 'bg-blue-600/30 border-blue-500/50'
            : 'bg-slate-700/30 border-transparent hover:bg-slate-700/50'"
          class="flex items-center gap-2 rounded-lg px-3 py-2 border cursor-pointer transition-colors"
        >
          <span class="text-white text-sm font-medium flex-1">{{ team.name }}</span>
          <span class="text-slate-400 text-xs">{{ team.players.length }} players</span>
          <template v-if="!gameActive">
            <button @click.stop="openEditTeam(team)" class="text-slate-400 hover:text-white text-xs transition-colors">Edit</button>
            <button @click.stop="confirmRemoveTeam(team.id)" class="text-red-400 hover:text-red-300 text-xs transition-colors">Remove</button>
          </template>
        </div>
        <p v-if="!teams.length" class="text-slate-500 text-sm text-center py-4">
          No teams yet. Create one to get started!
        </p>
      </div>
    </div>

    <!-- Roster for active team -->
    <div v-if="activeTeamId" class="bg-slate-800/50 rounded-xl p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-bold text-white">Roster ({{ roster.length }})</h2>
        <button
          v-if="!gameActive"
          @click="openAdd"
          class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold transition-colors"
        >
          + Add Player
        </button>
      </div>

      <!-- Player form -->
      <div v-if="showForm" class="bg-slate-700/50 rounded-lg p-3 mb-3">
        <div class="flex gap-2 mb-2">
          <input
            v-model="jerseyNumber"
            type="number"
            placeholder="#"
            min="0"
            max="99"
            class="bg-slate-600 text-white rounded-lg px-3 py-2 w-16 text-center text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            v-model="playerName"
            type="text"
            placeholder="Player name"
            class="bg-slate-600 text-white rounded-lg px-3 py-2 flex-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="save"
          />
        </div>
        <div class="flex gap-2">
          <button @click="save" class="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex-1 transition-colors">
            {{ editingId ? 'Save' : 'Add' }}
          </button>
          <button @click="showForm = false" class="bg-slate-600 hover:bg-slate-500 text-white px-4 py-1.5 rounded-lg text-sm flex-1 transition-colors">
            Cancel
          </button>
        </div>
      </div>

      <!-- Roster list -->
      <div class="space-y-1">
        <div
          v-for="player in roster"
          :key="player.id"
          class="flex items-center gap-2 bg-slate-700/30 rounded-lg px-3 py-2"
        >
          <span class="text-blue-400 font-bold text-sm min-w-[2rem] text-center">{{ player.jerseyNumber }}</span>
          <span class="text-white text-sm flex-1 truncate">{{ player.name }}</span>
          <template v-if="!gameActive">
            <button @click="openEdit(player)" class="text-slate-400 hover:text-white text-xs transition-colors">Edit</button>
            <button @click="remove(player.id)" class="text-red-400 hover:text-red-300 text-xs transition-colors">Remove</button>
          </template>
        </div>
        <p v-if="!roster.length" class="text-slate-500 text-sm text-center py-4">
          No players yet. Add your team!
        </p>
      </div>
    </div>
  </div>
</template>
