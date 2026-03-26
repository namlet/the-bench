<script setup>
import draggable from 'vuedraggable'
import PlayerCard from './PlayerCard.vue'

const props = defineProps({
  benchPlayers: { type: Array, default: () => [] },
  gameActive: Boolean,
  gamePaused: Boolean,
  getStintDuration: Function,
  getTotalFieldTime: Function,
  getTotalBenchTime: Function,
  getLastFieldStintMs: Function,
  thresholdMinutes: Number,
})

const emit = defineEmits(['update:benchPlayers', 'move-to-field', 'change'])

function onBenchChange(evt) {
  emit('change', evt)
}

function tapToField(playerId) {
  if (props.gameActive) {
    emit('move-to-field', playerId)
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <h2 class="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2 px-1">
      Bench ({{ benchPlayers.length }})
    </h2>

    <draggable
      :modelValue="benchPlayers"
      @update:modelValue="$emit('update:benchPlayers', $event)"
      group="players"
      item-key="id"
      :animation="200"
      ghost-class="opacity-30"
      @change="onBenchChange"
      class="flex-1 min-h-[4rem] bg-blue-900/20 border-2 border-dashed border-blue-700/30 rounded-xl p-1.5 space-y-1.5"
    >
      <template #item="{ element }">
        <div @click="tapToField(element.id)">
          <PlayerCard
            :player="element"
            :stintMs="getStintDuration(element.id)"
            :totalFieldTime="getTotalFieldTime(element.id)"
            :totalBenchTime="getTotalBenchTime(element.id)"
            :lastFieldStintMs="getLastFieldStintMs(element.id)"
            location="bench"
            :thresholdMinutes="thresholdMinutes"
            :gameActive="gameActive"
          />
        </div>
      </template>
    </draggable>
  </div>
</template>
