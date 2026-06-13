package com.google.io.holeInOne.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.io.holeInOne.data.GameState
import com.google.io.holeInOne.viewmodel.GameViewModel

@Composable
fun GameScreen(
    viewModel: GameViewModel = remember { GameViewModel() }
) {
    val gameState by viewModel.gameState.collectAsState()
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Game Canvas Area
        GameCanvasArea(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectDragGestures { change, dragAmount ->
                        viewModel.onDrag(dragAmount.x, dragAmount.y)
                        change.consume()
                    }
                },
            gameState = gameState,
            onStroke = { viewModel.handleStroke() }
        )
        
        // HUD Overlay
        GameHUD(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(16.dp),
            gameState = gameState,
            onRetry = { viewModel.retryLevel() },
            onNext = { viewModel.nextLevel() },
            onReset = { viewModel.resetGame() }
        )
        
        // Caddy Commentary
        if (gameState.lastCommentary != null) {
            CaddyCommentary(
                modifier = Modifier.align(Alignment.BottomCenter),
                commentary = gameState.lastCommentary,
                isLoading = gameState.commentaryLoading
            )
        }
    }
}

@Composable
fun GameCanvasArea(
    modifier: Modifier = Modifier,
    gameState: GameState,
    onStroke: () -> Unit
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "Level ${gameState.currentLevelIndex + 1}",
            color = Color.White,
            fontSize = 24.sp
        )
    }
}

@Composable
fun GameHUD(
    modifier: Modifier = Modifier,
    gameState: GameState,
    onRetry: () -> Unit,
    onNext: () -> Unit,
    onReset: () -> Unit
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Text(
            text = "Strokes: ${gameState.strokes}",
            color = Color.White,
            fontSize = 18.sp
        )
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
        ) {
            Button(
                onClick = onRetry,
                modifier = Modifier.weight(1f)
            ) {
                Text("Retry")
            }
            Button(
                onClick = onNext,
                modifier = Modifier.weight(1f)
            ) {
                Text("Next")
            }
        }
    }
}

@Composable
fun CaddyCommentary(
    modifier: Modifier = Modifier,
    commentary: String?,
    isLoading: Boolean
) {
    Surface(
        modifier = modifier
            .padding(16.dp)
            .fillMaxWidth(),
        color = Color(0xFF1F1F1F),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Caddy Analysis",
                color = Color(0xFF9BA0A6),
                fontSize = 14.sp
            )
            
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White
                )
            } else {
                Text(
                    text = "\"${commentary ?: "Good luck!}\"",
                    color = Color.White,
                    fontSize = 14.sp
                )
            }
        }
    }
}
