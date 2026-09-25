package com.geoplay.shared.game

import com.geoplay.shared.model.Activation
import com.geoplay.shared.model.Anchor
import com.geoplay.shared.model.Condition
import com.geoplay.shared.model.ConditionType
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.ModuleData
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

// Preuve 1.2 (change player-home-dashboard) : temps restant par POI lu
// des conditions TIMER existantes, sans nouvelle donnée.
private fun timerNode(id: String, vararg conds: Condition) = GameNode(
    id = id,
    module = ModuleData(type = "INFO"),
    activation = Activation(requires = conds.toList())
)

private fun timer(anchor: Anchor?, delay: Long, anchorNode: String? = null) = Condition(
    type = ConditionType.TIMER, anchor = anchor, delaySeconds = delay, anchorNodeId = anchorNode
)

class DashboardCommonTest {

    @Test
    fun gameStartCountdown() {
        val n = timerNode("q", timer(Anchor.GAME_START, 600L))
        assertEquals(360_000L, timerRemainingMs(n, emptyMap(), 240_000L))
    }

    @Test
    fun satisfiedTimerYieldsNull() {
        val n = timerNode("q", timer(Anchor.GAME_START, 60L))
        assertNull(timerRemainingMs(n, emptyMap(), 61_000L))
    }

    @Test
    fun missingNodeCompletionAnchorYieldsNull() {
        val n = timerNode("q", timer(Anchor.NODE_COMPLETION, 60L, "a"))
        assertNull(timerRemainingMs(n, emptyMap(), 0L))
    }

    @Test
    fun nodeCompletionAnchorCountdown() {
        val n = timerNode("q", timer(Anchor.NODE_COMPLETION, 60L, "a"))
        assertEquals(30_000L, timerRemainingMs(n, mapOf("a" to 100_000L), 130_000L))
    }

    @Test
    fun multiTimerFirstUnsatisfied() {
        val n = timerNode(
            "q",
            timer(Anchor.GAME_START, 10L),
            timer(Anchor.GAME_START, 600L)
        )
        assertEquals(590_000L, timerRemainingMs(n, emptyMap(), 10_000L))
    }

    @Test
    fun noTimerYieldsNull() {
        val n = timerNode("q", Condition(type = ConditionType.NODE_COMPLETED, nodeId = "a"))
        assertNull(timerRemainingMs(n, mapOf("a" to 1L), 999_999L))
    }

    @Test
    fun formatDurationReads() {
        assertEquals("00:00", com.geoplay.shared.ui.home.formatDuration(0L))
        assertEquals("06:00", com.geoplay.shared.ui.home.formatDuration(360_000L))
        assertEquals("1:02:03", com.geoplay.shared.ui.home.formatDuration(3_723_000L))
    }

    @Test
    fun defaultViewRule() {        val home = com.geoplay.shared.model.Game(
            gameId = "v",
            nodes = listOf(
                GameNode(
                    id = "a",
                    module = ModuleData(type = "INFO"),
                    activation = com.geoplay.shared.model.Activation()
                )
            ),
            global = com.geoplay.shared.model.GlobalData(presentation = listOf("HOME"))
        )
        assertEquals(true, showHomeDashboard(home, null))
        assertEquals(false, showHomeDashboard(home, "a"))
        val combo = home.copy(global = com.geoplay.shared.model.GlobalData(presentation = listOf("HOME", "MAP", "TOOLBOX")))
        assertEquals(true, showHomeDashboard(combo, null))
        val plain = home.copy(global = com.geoplay.shared.model.GlobalData(presentation = listOf("MAP")))
        assertEquals(false, showHomeDashboard(plain, null))
    }

    private fun immersionGame(): com.geoplay.shared.model.Game {
        val noDep = com.geoplay.shared.model.Activation()
        val depBaker = com.geoplay.shared.model.Activation(
            requires = listOf(
                Condition(type = ConditionType.NODE_COMPLETED, nodeId = "baker")
            )
        )
        fun node(id: String, activation: com.geoplay.shared.model.Activation) = GameNode(
            id = id,
            module = ModuleData(type = "INFO"),
            activation = activation
        )
        return com.geoplay.shared.model.Game(
            gameId = "imm",
            nodes = listOf(node("start", noDep), node("baker", noDep), node("scotland", depBaker)),
            global = com.geoplay.shared.model.GlobalData()
        )
    }

    @Test
    fun principalPrefersEligibleStart() {
        val g = immersionGame()
        assertEquals("start", noeudPrincipal(g, listOf("start", "baker"), emptySet(), listOf("start")))
    }

    @Test
    fun principalFallsBackToRoot() {
        val g = immersionGame()
        assertEquals("baker", noeudPrincipal(g, listOf("baker", "scotland"), emptySet(), listOf("baker")))
    }

    @Test
    fun principalFallsBackToQueueHead() {
        val g = immersionGame()
        // Ni start ni racine éligibles : tête de file non terminée.
        assertEquals("scotland", noeudPrincipal(g, listOf("scotland"), emptySet(), listOf("scotland")))
    }

    @Test
    fun principalResumeSkipsCompleted() {
        val g = immersionGame()
        // Reprise : start terminé, baker reste le principal.
        assertEquals("baker", noeudPrincipal(g, listOf("start", "baker"), setOf("start"), listOf("baker")))
    }

    @Test
    fun principalNullWhenNothingOpen() {
        val g = immersionGame()
        assertEquals(null, noeudPrincipal(g, emptyList(), setOf("start"), emptyList()))
    }
}
