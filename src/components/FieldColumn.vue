<script setup>
import draggable from 'vuedraggable'
import PlayerCard from './PlayerCard.vue'

const props = defineProps({
  fieldPlayers: { type: Array, default: () => [] },
  goalie: { type: Object, default: null },
  gameActive: Boolean,
  gamePaused: Boolean,
  getStintDuration: Function,
  getTotalFieldTime: Function,
  getTotalBenchTime: Function,
  getLastFieldStintMs: Function,
  thresholdMinutes: Number,
})

const emit = defineEmits([
  'update:fieldPlayers',
  'move-to-bench',
  'set-goalie',
  'drag-to-goalie',
  'drag-from-goalie',
  'change',
])

function onFieldChange(evt) {
  emit('change', evt)
}

function handleGoalieChange(evt) {
  if (evt.added) {
    emit('drag-to-goalie', evt.added.element)
  }
  if (evt.removed) {
    emit('drag-from-goalie')
  }
}

function tapToBench(playerId) {
  if (props.gameActive) {
    emit('move-to-bench', playerId)
  }
}

function tapGoalieToBench() {
  if (props.gameActive && props.goalie) {
    emit('move-to-bench', props.goalie.id)
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <h2 class="text-sm font-bold text-green-400 uppercase tracking-wider mb-2 px-1">
      Field ({{ fieldPlayers.length + (goalie ? 1 : 0) }})
    </h2>

    <!-- Goalie slot -->
    <div class="mb-2">
      <div class="text-[10px] text-green-300/60 uppercase tracking-wider mb-1 px-1">Goalie</div>
      <draggable
        :modelValue="goalie ? [goalie] : []"
        group="players"
        item-key="id"
        :animation="200"
        ghost-class="opacity-30"
        @change="handleGoalieChange"
        class="min-h-[3rem] bg-green-900/30 border-2 border-dashed border-green-700/40 rounded-xl p-1.5"
      >
        <template #item="{ element }">
          <div @click="tapGoalieToBench">
            <PlayerCard
              :player="element"
              :stintMs="getStintDuration(element.id)"
              :totalFieldTime="getTotalFieldTime(element.id)"
              :totalBenchTime="getTotalBenchTime(element.id)"
              location="field"
              :thresholdMinutes="thresholdMinutes"
              :gameActive="gameActive"
              compact
            />
          </div>
        </template>
      </draggable>
    </div>

    <!-- Field players -->
    <div class="text-[10px] text-green-300/60 uppercase tracking-wider mb-1 px-1">Players</div>
    <draggable
      :modelValue="fieldPlayers"
      @update:modelValue="$emit('update:fieldPlayers', $event)"
      group="players"
      item-key="id"
      :animation="200"
      ghost-class="opacity-30"
      @change="onFieldChange"
      class="flex-1 min-h-[4rem] bg-green-900/20 border-2 border-dashed border-green-700/30 rounded-xl p-1.5 space-y-1.5"
    >
      <template #item="{ element }">
        <div @click="tapToBench(element.id)">
          <PlayerCard
            :player="element"
            :stintMs="getStintDuration(element.id)"
            :totalFieldTime="getTotalFieldTime(element.id)"
            :totalBenchTime="getTotalBenchTime(element.id)"
            location="field"
            :thresholdMinutes="thresholdMinutes"
            :gameActive="gameActive"
          />
        </div>
      </template>
    </draggable>
  </div>
</template>
