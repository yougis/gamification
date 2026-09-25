package com.geoplay.shared.ui.quiz

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

// Écran du module QUIZ (change player-kmp-migration, 4.3) : sélection de
// réponse, validation question par question, feedback, score, `onComplete`
// avec le total en fin de questionnaire.
@Composable
fun QuizScreen(
    questions: List<QuizQuestion>,
    onComplete: (Int) -> Unit,
    modifier: Modifier = Modifier,
    // Indice résolu depuis inventoryHints (Nœud ACTIVE uniquement, fourni
    // par l'appelant). Passif : zone d'affichage, jamais de modale.
    hint: String? = null,
) {
    var index by remember { mutableStateOf(0) }
    var picked by remember { mutableStateOf<Int?>(null) }
    val answers = remember { mutableStateMapOf<Int, Int>() }
    if (questions.isEmpty()) {
        Text(text = "Quiz sans questions.", modifier = modifier.padding(16.dp))
        return
    }
    val question = questions[index]
    val validated = picked != null
    Column(modifier = modifier.padding(16.dp)) {
        if (hint != null) {
            Text(
                text = "💡 $hint",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
        Text(
            text = "Question ${index + 1}/${questions.size}",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(text = question.text, style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(vertical = 8.dp))
        question.options.forEachIndexed { i, option ->
            val isPicked = picked == i
            val isCorrect = question.correctIndex == i
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
                    .clickable(enabled = !validated) { picked = i },
            ) {
                Text(
                    text = (if (option.text.isNotEmpty()) option.text else "[image]").let {
                        if (validated && isPicked) (if (isCorrect) "✓ " else "✗ ") + it else it
                    },
                    modifier = Modifier.padding(12.dp),
                    color = if (validated && isPicked && !isCorrect) MaterialTheme.colorScheme.error
                    else MaterialTheme.colorScheme.onSurface,
                )
            }
        }
        if (validated) {
            val correct = picked == question.correctIndex
            Text(
                text = if (correct) "Bonne réponse !" else "Raté.",
                color = if (correct) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(vertical = 4.dp),
            )
            question.explanation?.let {
                Text(text = it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(bottom = 4.dp))
            }
            Button(onClick = {
                answers[index] = picked!!
                if (index + 1 >= questions.size) {
                    onComplete(scoreQuiz(questions, answers))
                } else {
                    index++
                    picked = null
                }
            }) {
                Text(if (index + 1 >= questions.size) "Terminer" else "Suivante")
            }
        }
    }
}
