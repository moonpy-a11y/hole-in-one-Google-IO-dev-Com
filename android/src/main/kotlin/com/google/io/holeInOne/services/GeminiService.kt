package com.google.io.holeInOne.services

import com.google.ai.client.generativeai.GenerativeModel

class GeminiService {
    private val model = GenerativeModel(
        modelName = "gemini-1.5-flash",
        apiKey = "" // Add your API key here
    )
    
    suspend fun generateCommentary(levelName: String, strokes: Int): String {
        val prompt = """
            You are a professional golf caddy providing brief, encouraging commentary.
            The player just took $strokes strokes on $levelName.
            Provide a short, witty comment (1-2 sentences) about their shot.
            Keep it under 100 characters.
        """.trimIndent()
        
        return try {
            val response = model.generateContent(prompt)
            response.text ?: "Nice shot!"
        } catch (e: Exception) {
            "Good effort!"
        }
    }
}
