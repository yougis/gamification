package com.geoplay.shared.game

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
