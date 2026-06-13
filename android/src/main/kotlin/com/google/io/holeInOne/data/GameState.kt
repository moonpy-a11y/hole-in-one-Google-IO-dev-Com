package com.google.io.holeInOne.data

data class GameState(
    val currentLevelIndex: Int = 0,
    val strokes: Int = 0,
    val totalScore: Int = 0,
    val points: Int = 0,
    val state: GameStateType = GameStateType.AIMING,
    val lastCommentary: String? = null,
    val commentaryLoading: Boolean = false,
    val bestScores: Map<Int, Int> = emptyMap(),
    val resetUnlocked: Boolean = false
)

enum class GameStateType {
    AIMING,
    MOVING,
    LEVEL_COMPLETE,
    GAME_OVER
}
