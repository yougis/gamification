package com.geoplay.shared.game

import com.geoplay.shared.model.Game
import com.geoplay.shared.model.GameNode
import com.geoplay.shared.model.ScreenBackground
import com.geoplay.shared.model.ScreenDefinition
import com.geoplay.shared.model.ScreenWidget
import com.geoplay.shared.model.ScreenZones
import com.geoplay.shared.model.WidgetStyles
import com.geoplay.shared.model.ZoneContent

// Résolution d'écran auteur (change parite-player) : fonctions pures,
// testées en commonTest, consommées par les 3 players via le `shared`.
//
// Règle : node.screen ?: global.screen ?: écran par défaut. Les zones
// fusionnent par nom (le nœud remplace zone par zone), les styles par
// propriété (dernier niveau renseigné gagne).

fun defaultScreen(): ScreenDefinition = ScreenDefinition(
    background = ScreenBackground(type = "color", value = "#08090b"),
    zones = ScreenZones(content = ZoneContent(layout = "stack")),
)

fun mergeWidgetStyles(base: WidgetStyles?, over: WidgetStyles?): WidgetStyles? {
    if (base == null) return over
    if (over == null) return base
    return WidgetStyles(
        fontFamily = over.fontFamily ?: base.fontFamily,
        fontSize = over.fontSize ?: base.fontSize,
        fontWeight = over.fontWeight ?: base.fontWeight,
        color = over.color ?: base.color,
        align = over.align ?: base.align,
    )
}

fun mergeZones(global: ScreenZones?, local: ScreenZones?): ScreenZones? {
    if (global == null) return local
    if (local == null) return global
    return ScreenZones(
        header = local.header ?: global.header,
        content = local.content ?: global.content,
        footer = local.footer ?: global.footer,
        overlay = local.overlay ?: global.overlay,
    )
}

fun resolveScreen(game: Game, node: GameNode): ScreenDefinition {
    val global = game.global.screen
    val local = node.screen
    if (local == null) return global ?: defaultScreen()
    if (global == null) return local
    return ScreenDefinition(
        layout = local.layout ?: global.layout,
        background = local.background ?: global.background,
        zones = mergeZones(global.zones, local.zones),
        transitions = local.transitions ?: global.transitions,
        styles = mergeWidgetStyles(global.styles, local.styles),
    )
}

fun resolveWidgetStyle(game: Game, node: GameNode, widget: ScreenWidget): WidgetStyles =
    mergeWidgetStyles(resolveScreen(game, node).styles, widget.styles) ?: WidgetStyles()
