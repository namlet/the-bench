import { ref, computed, watch } from 'vue'
import { useLocalStorage } from './useLocalStorage.js'

export function useGameState() {
  const teams = useLocalStorage('bench-teams', [])
  const activeTeamId = useLocalStorage('bench-active-team', null)
  const settings = useLocalStorage('bench-settings', {
    redThresholdMinutes: 7,
    enableSound: false,
    enableVibration: false,
    equalPlayTime: false,
  })
  const gameHistory = useLocalStorage('bench-history', [])

  // Current game state
  const gameActive = ref(false)
  const gamePaused = ref(false)
  const isHalftime = ref(false)
  const gameStartTime = ref(null)
  const pauseStartTime = ref(null)
  const totalPausedMs = ref(0)

  // Players on field, bench, and goalie
  const fieldPlayers = ref([])
  const benchPlayers = ref([])
  const goalie = ref(null)

  // Event log for current game
  const gameEvents = ref([])

  // Per-player timing: { playerId: { currentStintStart, location, stints: [{ location, start, end }] } }
  const playerTimers = ref({})

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
  }

  // Active team
  const activeTeam = computed(() => {
    if (!activeTeamId.value) return null
    return teams.value.find(t => t.id === activeTeamId.value) || null
  })

  // Roster is the active team's players
  const roster = computed(() => {
    return activeTeam.value ? activeTeam.value.players : []
  })

  // Team management
  function addTeam(name) {
    const team = {
      id: generateId(),
      name,
      players: [],
    }
    teams.value.push(team)
    activeTeamId.value = team.id
    return team
  }

  function updateTeam(id, updates) {
    const idx = teams.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      teams.value[idx] = { ...teams.value[idx], ...updates }
    }
  }

  function removeTeam(id) {
    teams.value = teams.value.filter(t => t.id !== id)
    if (activeTeamId.value === id) {
      activeTeamId.value = teams.value.length ? teams.value[0].id : null
    }
  }

  function setActiveTeam(id) {
    activeTeamId.value = id
  }

  // Roster management (operates on active team)
  function addPlayer(name, jerseyNumber) {
    if (!activeTeam.value) return null
    const player = {
      id: generateId(),
      name,
      jerseyNumber,
    }
    activeTeam.value.players.push(player)
    return player
  }

  function updatePlayer(id, updates) {
    if (!activeTeam.value) return
    const idx = activeTeam.value.players.findIndex(p => p.id === id)
    if (idx !== -1) {
      activeTeam.value.players[idx] = { ...activeTeam.value.players[idx], ...updates }
    }
  }

  function removePlayer(id) {
    if (!activeTeam.value) return
    activeTeam.value.players = activeTeam.value.players.filter(p => p.id !== id)
  }

  function now() {
    return Date.now()
  }

  function gameElapsedMs() {
    if (!gameStartTime.value) return 0
    const currentPause = gamePaused.value ? (now() - pauseStartTime.value) : 0
    return now() - gameStartTime.value - totalPausedMs.value - currentPause
  }

  // Start a new game
  function startGame() {
    gameActive.value = true
    gamePaused.value = false
    isHalftime.value = false
    gameStartTime.value = now()
    totalPausedMs.value = 0
    gameEvents.value = []

    // Put all players on the bench initially
    benchPlayers.value = roster.value.map(p => ({ ...p }))
    fieldPlayers.value = []
    goalie.value = null

    // Initialize timers
    const timers = {}
    roster.value.forEach(p => {
      timers[p.id] = {
        currentStintStart: now(),
        location: 'bench',
        stints: [{ location: 'bench', start: now(), end: null }],
      }
    })
    playerTimers.value = timers
  }

  function pauseGame() {
    if (!gameActive.value || gamePaused.value) return
    gamePaused.value = true
    pauseStartTime.value = now()
  }

  function resumeGame() {
    if (!gameActive.value || !gamePaused.value) return
    const pauseDuration = now() - pauseStartTime.value
    totalPausedMs.value += pauseDuration
    gamePaused.value = false
    isHalftime.value = false

    // Adjust all current stint starts by pause duration
    const timers = { ...playerTimers.value }
    Object.keys(timers).forEach(id => {
      const timer = { ...timers[id] }
      timer.currentStintStart += pauseDuration
      const stints = [...timer.stints]
      const last = { ...stints[stints.length - 1] }
      last.start += pauseDuration
      stints[stints.length - 1] = last
      timer.stints = stints
      timers[id] = timer
    })
    playerTimers.value = timers
  }

  function halftime() {
    pauseGame()
    isHalftime.value = true
  }

  function endGame() {
    if (!gameActive.value) return

    // Close all open stints
    const timers = { ...playerTimers.value }
    Object.keys(timers).forEach(id => {
      const timer = { ...timers[id] }
      const stints = [...timer.stints]
      const last = { ...stints[stints.length - 1] }
      last.end = now()
      stints[stints.length - 1] = last
      timer.stints = stints
      timers[id] = timer
    })
    playerTimers.value = timers

    // Save to history
    const gameRecord = {
      id: generateId(),
      date: new Date().toISOString(),
      teamId: activeTeamId.value,
      teamName: activeTeam.value ? activeTeam.value.name : 'Unknown',
      events: [...gameEvents.value],
      playerTimers: JSON.parse(JSON.stringify(timers)),
      roster: roster.value.map(p => ({ ...p })),
    }
    gameHistory.value = [gameRecord, ...gameHistory.value]

    gameActive.value = false
    gamePaused.value = false
    isHalftime.value = false
    fieldPlayers.value = []
    benchPlayers.value = []
    goalie.value = null
    playerTimers.value = {}
  }

  // Move player to field
  function moveToField(playerId) {
    const benchIdx = benchPlayers.value.findIndex(p => p.id === playerId)
    if (benchIdx === -1) return

    const player = benchPlayers.value[benchIdx]
    benchPlayers.value.splice(benchIdx, 1)
    fieldPlayers.value.push(player)

    recordMove(playerId, 'field')
  }

  // Move player to bench
  function moveToBench(playerId) {
    // Check field players
    const fieldIdx = fieldPlayers.value.findIndex(p => p.id === playerId)
    if (fieldIdx !== -1) {
      const player = fieldPlayers.value[fieldIdx]
      fieldPlayers.value.splice(fieldIdx, 1)
      benchPlayers.value.push(player)
      recordMove(playerId, 'bench')
      return
    }

    // Check if goalie
    if (goalie.value && goalie.value.id === playerId) {
      const player = goalie.value
      goalie.value = null
      benchPlayers.value.push(player)
      recordMove(playerId, 'bench')
    }
  }

  // Set player as goalie
  function setGoalie(playerId) {
    // Find the player from bench or field
    let player = null
    const benchIdx = benchPlayers.value.findIndex(p => p.id === playerId)
    if (benchIdx !== -1) {
      player = benchPlayers.value[benchIdx]
      benchPlayers.value.splice(benchIdx, 1)
    } else {
      const fieldIdx = fieldPlayers.value.findIndex(p => p.id === playerId)
      if (fieldIdx !== -1) {
        player = fieldPlayers.value[fieldIdx]
        fieldPlayers.value.splice(fieldIdx, 1)
      }
    }

    if (!player) return

    // If there's already a goalie, send them to bench
    if (goalie.value) {
      benchPlayers.value.push(goalie.value)
      recordMove(goalie.value.id, 'bench')
    }

    goalie.value = player
    recordMove(playerId, 'field')
  }

  function recordMove(playerId, newLocation) {
    const timer = playerTimers.value[playerId]
    if (!timer) return

    // Close current stint
    const stints = [...timer.stints]
    const last = { ...stints[stints.length - 1] }
    last.end = now()
    stints[stints.length - 1] = last

    // If moving to bench, capture how long the prior field stint was
    const lastFieldStintMs = (newLocation === 'bench' && last.location === 'field')
      ? (last.end - last.start)
      : (timer.lastFieldStintMs || 0)

    // Open new stint
    stints.push({ location: newLocation, start: now(), end: null })

    playerTimers.value = {
      ...playerTimers.value,
      [playerId]: {
        currentStintStart: now(),
        location: newLocation,
        lastFieldStintMs,
        stints,
      },
    }

    gameEvents.value.push({
      playerId,
      action: newLocation === 'field' ? 'to_field' : 'to_bench',
      timestamp: now(),
      gameTime: gameElapsedMs(),
    })
  }

  // Get current stint duration for a player (in ms)
  function getStintDuration(playerId) {
    const timer = playerTimers.value[playerId]
    if (!timer) return 0
    // When paused, freeze at the moment pause started
    if (gamePaused.value) {
      return pauseStartTime.value - timer.currentStintStart
    }
    return now() - timer.currentStintStart
  }

  // Get total field time for a player (in ms)
  function getTotalFieldTime(playerId) {
    const timer = playerTimers.value[playerId]
    if (!timer) return 0
    return timer.stints.reduce((total, stint) => {
      if (stint.location !== 'field') return total
      const end = stint.end || now()
      return total + (end - stint.start)
    }, 0)
  }

  // Get total bench time for a player (in ms)
  function getTotalBenchTime(playerId) {
    const timer = playerTimers.value[playerId]
    if (!timer) return 0
    return timer.stints.reduce((total, stint) => {
      if (stint.location !== 'bench') return total
      const end = stint.end || now()
      return total + (end - stint.start)
    }, 0)
  }

  // Get the duration of the player's last field stint (for bench cooldown color).
  // Handles the timing gap where vuedraggable has moved the player to the bench
  // array but recordMove hasn't updated the timer yet — in that case the timer
  // still shows location='field', so we compute the stint live.
  function getLastFieldStintMs(playerId) {
    const timer = playerTimers.value[playerId]
    if (!timer) return 0
    if (timer.location === 'field') {
      return now() - timer.currentStintStart
    }
    return timer.lastFieldStintMs || 0
  }

  // Get halftime swap suggestions (players with most field time should go to bench)
  function getSwapSuggestions() {
    const fieldIds = [
      ...fieldPlayers.value.map(p => p.id),
      ...(goalie.value ? [goalie.value.id] : []),
    ]
    const benchIds = benchPlayers.value.map(p => p.id)

    const fieldByTime = fieldIds
      .map(id => ({ id, time: getTotalFieldTime(id) }))
      .sort((a, b) => b.time - a.time)

    const benchByTime = benchIds
      .map(id => ({ id, time: getTotalBenchTime(id) }))
      .sort((a, b) => b.time - a.time)

    // Suggest swapping the most-played field players with the most-rested bench players
    const swaps = []
    const count = Math.min(fieldByTime.length, benchByTime.length, 3)
    for (let i = 0; i < count; i++) {
      const fieldPlayer = roster.value.find(p => p.id === fieldByTime[i].id)
      const benchPlayer = roster.value.find(p => p.id === benchByTime[i].id)
      if (fieldPlayer && benchPlayer) {
        swaps.push({ out: fieldPlayer, in: benchPlayer })
      }
    }
    return swaps
  }

  // Migrate legacy single-roster data to teams format
  function migrateLegacyRoster() {
    const legacyRoster = localStorage.getItem('bench-roster')
    if (legacyRoster) {
      const players = JSON.parse(legacyRoster)
      if (players.length > 0 && teams.value.length === 0) {
        const team = addTeam('My Team')
        team.players = players
      }
      localStorage.removeItem('bench-roster')
    }
  }

  migrateLegacyRoster()

  return {
    teams,
    activeTeamId,
    activeTeam,
    roster,
    settings,
    gameHistory,
    gameActive,
    gamePaused,
    isHalftime,
    fieldPlayers,
    benchPlayers,
    goalie,
    gameEvents,
    playerTimers,
    addTeam,
    updateTeam,
    removeTeam,
    setActiveTeam,
    addPlayer,
    updatePlayer,
    removePlayer,
    startGame,
    pauseGame,
    resumeGame,
    halftime,
    endGame,
    moveToField,
    moveToBench,
    setGoalie,
    recordMove,
    getStintDuration,
    getLastFieldStintMs,
    getTotalFieldTime,
    getTotalBenchTime,
    getSwapSuggestions,
    gameElapsedMs,
  }
}
