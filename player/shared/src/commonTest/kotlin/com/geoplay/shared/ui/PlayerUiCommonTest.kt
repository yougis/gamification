package com.geoplay.shared.ui

import com.geoplay.shared.model.NodeState
import com.geoplay.shared.ui.graph.nodeStateLabel
import com.geoplay.shared.ui.quiz.QuizQuestion
import com.geoplay.shared.ui.quiz.parseQuizQuestions
import com.geoplay.shared.ui.quiz.scoreQuiz
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class PlayerUiCommonTest {

    @Test
    fun nodeStatesHaveLabels() {
        assertEquals("Verrouillée", nodeStateLabel(NodeState.LOCKED))
        assertEquals("Disponible", nodeStateLabel(NodeState.UNLOCKED))
        assertEquals("En cours", nodeStateLabel(NodeState.ACTIVE))
        assertEquals("Terminée", nodeStateLabel(NodeState.COMPLETED))
    }

    @Test
    fun parseQuizMixedOptions() {
        val data = mapOf(
            "questions" to Json.parseToJsonElement(
                """[{"q":"Capitale ?","options":["Paris",{"text":"Lyon"},{"image":"lyon.jpg"}],"correctIndex":0,"points":2}]""",
            ),
        )
        val questions = parseQuizQuestions(data)
        assertEquals(1, questions.size)
        assertEquals(3, questions[0].options.size)
        assertEquals("Paris", questions[0].options[0].text)
        assertEquals("lyon.jpg", questions[0].options[2].image)
        assertEquals(0, questions[0].correctIndex)
        assertEquals(2, questions[0].points)
    }

    @Test
    fun parseQuizSkipsMalformed() {
        val data = mapOf(
            "questions" to Json.parseToJsonElement("""[{"options":["A","B"]},"pas un objet"]"""),
        )
        assertTrue(parseQuizQuestions(data).isEmpty())
        assertTrue(parseQuizQuestions(emptyMap()).isEmpty())
    }

    @Test
    fun scoreQuizSumsCorrect() {
        val questions = listOf(
            QuizQuestion("Q1", emptyList(), correctIndex = 1, points = 2),
            QuizQuestion("Q2", emptyList(), correctIndex = 0, points = 3),
        )
        assertEquals(5, scoreQuiz(questions, mapOf(0 to 1, 1 to 0)))
        assertEquals(2, scoreQuiz(questions, mapOf(0 to 1, 1 to 1)))
        assertEquals(0, scoreQuiz(questions, emptyMap()))
    }
}
