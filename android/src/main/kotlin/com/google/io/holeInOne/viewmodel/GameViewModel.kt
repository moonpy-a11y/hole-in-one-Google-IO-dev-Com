package com.google.io.holeInOne.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.io.holeInOne.data.GameState
import com.google.io.holeInOne.data.GameStateType
import com.google.io.holeInOne.services.GeminiService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class GameViewModel : ViewModel() {
    private val _gameState = MutableStateFlow(GameState())
    val gameState: StateFlow<GameState> = _gameState
    
    private val geminiService = GeminiService()
    
    fun onDrag(dx: Float, dy: Float) {
        // Handle drag input from touch gestures
        // This will be used to aim the golf shot
    }
    
    fun handleStroke() {
        val currentState = _gameState.value
        _gameState.value = currentState.copy(
            strokes = currentState.strokes + 1,
            state = GameStateType.MOVING
        )
    }
    
    fun retryLevel() {
        val currentState = _gameState.value
        _gameState.value = currentState.copy(
            strokes = 0,
            state = GameStateType.AIMING,
            lastCommentary = null,
            commentaryLoading = false
        )
    }
    
    fun nextLevel() {
        val currentState = _gameState.value
        val nextIndex = currentState.currentLevelIndex + 1
        
        _gameState.value = currentState.copy(
            currentLevelIndex = nextIndex,
            strokes = 0,
            state = GameStateType.AIMING,
            lastCommentary = null,
            commentaryLoading = false
        )
    }
    
    fun resetGame() {
        _gameState.value = GameState()
    }
    
    fun loadCaddyCommentary() {
        val currentState = _gameState.value
        
        viewModelScope.launch {
            _gameState.value = currentState.copy(commentaryLoading = true)
            
            try {
                val commentary = geminiService.generateCommentary(
                    levelName = "Level ${currentState.currentLevelIndex + 1}",
                    strokes = currentState.strokes
                )
                
                _gameState.value = currentState.copy(
                    lastCommentary = commentary,
                    commentaryLoading = false
                )
            } catch (e: Exception) {
                _gameState.value = currentState.copy(commentaryLoading = false)
            }
        }
    }
}
