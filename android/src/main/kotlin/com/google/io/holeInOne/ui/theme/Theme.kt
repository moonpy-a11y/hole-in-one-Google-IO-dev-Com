package com.google.io.holeInOne.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF0F9D58),
    secondary = Color(0xFFFBBC04),
    tertiary = Color(0xFFEA4335),
    background = Color.Black,
    surface = Color(0xFF1F1F1F),
    onBackground = Color.White,
    onSurface = Color.White
)

@Composable
fun HoleInOneTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
