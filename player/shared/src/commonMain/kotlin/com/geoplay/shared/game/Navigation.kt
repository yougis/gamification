package com.geoplay.shared.game

import com.geoplay.shared.model.NodeState

// Etat navigation explicite (change home-player-runtime, 3.1.1) : pur, sans
// cablage UI, miroir de studio/src/game/navigation.ts. La navigation ne touche
// jamais le moteur : seuls Valider/Abandonner ecrivent.
enum class VueMode { APERCU, JOUABLE, RELECTURE, REJEU }

sealed interface Navigation {
    data object Home : Navigation
    data class Volet(val id: String) : Navigation
    data class Etape(val id: String, val mode: VueMode) : Navigation
    data object PleinEcran : Navigation
}

fun navigationInitiale(): Navigation = Navigation.Home

// Mode vue depuis l'etat moteur (change simulateur-compose-sans-pwa) :
// pur et teste. UNLOCKED affichee = JOUABLE, COMPLETED
// relue = RELECTURE, sinon (LOCKED, inconnu) = APERCU. REJEU en 4.x.
fun modeVue(etat: NodeState?): VueMode = when (etat) {
    NodeState.UNLOCKED -> VueMode.JOUABLE
    NodeState.COMPLETED -> VueMode.RELECTURE
    else -> VueMode.APERCU
}
