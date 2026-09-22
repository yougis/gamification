package com.geoplay.shared.ui.quiz

import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull

// Modèle QUIZ côté player (change player-kmp-migration, 4.3) : parse pur du
// `module.data` (options texte et/ou image, exactement une bonne réponse).
data class QuizOption(val text: String, val image: String? = null)

data class QuizQuestion(
    val text: String,
    val options: List<QuizOption>,
    val correctIndex: Int = 0,
    val explanation: String? = null,
    val points: Int = 1,
)

private fun parseOption(el: JsonElement): QuizOption? = when (el) {
    is JsonPrimitive -> QuizOption(text = el.content)
    is JsonObject -> {
        val text = (el["text"] as? JsonPrimitive)?.content.orEmpty()
        val image = (el["image"] as? JsonPrimitive)?.content
        if (text.isEmpty() && image.isNullOrEmpty()) null
        else QuizOption(text = text, image = image)
    }
    else -> null
}

fun parseQuizQuestions(data: Map<String, JsonElement>): List<QuizQuestion> {
    val raw = data["questions"] as? kotlinx.serialization.json.JsonArray ?: return emptyList()
    return raw.mapNotNull { q ->
        val obj = q as? JsonObject ?: return@mapNotNull null
        val text = (obj["q"] as? JsonPrimitive)?.content ?: return@mapNotNull null
        val options = (obj["options"] as? kotlinx.serialization.json.JsonArray)
            ?.mapNotNull(::parseOption)
            .orEmpty()
        val correct = (obj["correctIndex"] as? JsonPrimitive)?.intOrNull ?: 0
        QuizQuestion(
            text = text,
            options = options,
            correctIndex = correct,
            explanation = (obj["explanation"] as? JsonPrimitive)?.content,
            points = (obj["points"] as? JsonPrimitive)?.intOrNull ?: 1,
        )
    }
}

// Score pur (testé en commonTest) : somme des points des bonnes réponses.
fun scoreQuiz(questions: List<QuizQuestion>, answers: Map<Int, Int>): Int =
    questions.mapIndexedNotNull { i, q ->
        if (answers[i] == q.correctIndex) q.points else null
    }.sum()
