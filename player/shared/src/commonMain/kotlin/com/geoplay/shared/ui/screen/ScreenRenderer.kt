package com.geoplay.shared.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.geoplay.shared.model.Branding
import com.geoplay.shared.model.ScreenDefinition
import com.geoplay.shared.model.ScreenWidget
import com.geoplay.shared.model.WidgetStyles
import com.geoplay.shared.model.ZoneContent
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull

// Renderer d'écran auteur (change parite-player) : partagé par les 3
// players. Les assets (images) sont résolus par le shell via
// `imageContent` (chaque plateforme lit ses fichiers pack) ; les styles
// arrivent déjà résolus via `styleOf` (par défaut : styles propres).
// Layouts `grid`/`free` rendus en `stack` en phase 1 (documenté).

fun parseHexColor(hex: String?): Color? {
    if (hex == null) return null
    val h = hex.trimStart('#')
    val full = when (h.length) {
        3 -> "FF" + h.map { "$it$it" }.joinToString("")
        6 -> "FF$h"
        8 -> h
        else -> return null
    }
    return try {
        Color(full.toLong(16))
    } catch (_: NumberFormatException) {
        null
    }
}

fun textAlignOf(align: String?): TextAlign = when (align) {
    "center" -> TextAlign.Center
    "right" -> TextAlign.Right
    else -> TextAlign.Left
}

fun fontWeightOf(weight: String?): FontWeight =
    if (weight == "bold") FontWeight.Bold else FontWeight.Normal

fun spacerHeightDp(widget: ScreenWidget): Dp {
    val el = widget.height ?: return 8.dp
    val num = when (el) {
        is JsonPrimitive -> el.doubleOrNull ?: el.content.filter { it.isDigit() || it == '.' }.toDoubleOrNull()
        else -> null
    }
    return ((num ?: 8.0).toFloat()).dp
}

@Composable
fun ScreenRenderer(
    screen: ScreenDefinition,
    branding: Branding? = null,
    moduleSlot: @Composable () -> Unit = {},
    imageContent: @Composable (src: String, alt: String?) -> Unit = { _, _ -> },
    styleOf: (ScreenWidget) -> WidgetStyles = { it.styles ?: WidgetStyles() },
    onButtonAction: (action: String?) -> Unit = {},
    progressFraction: Float? = null,
    // Contexte de sous-page (change screen-subpages) : quand le contenu est
    // paginé, le widget progress (steps) reflète page i/N. Une fraction
    // explicite (ex. score) garde la priorité.
    pageIndex: Int? = null,
    pageTotal: Int? = null,
    modifier: Modifier = Modifier,
) {
    val zones = screen.zones
    val bg = screen.background
    var overlayDismissed by remember(screen) { mutableStateOf(false) }
    Box(modifier = modifier.fillMaxSize()) {
        when (bg?.type) {
            "image" -> if (!bg.value.isBlank()) imageContent(bg.value, null)
            else -> Box(
                Modifier.fillMaxSize()
                    .background(parseHexColor(bg?.value) ?: Color(0xFF08090B)),
            )
        }
        val scrim = bg?.overlay
        if ((scrim ?: 0.0) > 0.0) {
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = scrim!!.toFloat().coerceIn(0f, 1f))))
        }
        Column(Modifier.fillMaxSize()) {
            zones?.header?.let { ZoneBlock(it, branding, moduleSlot, imageContent, styleOf, onButtonAction, progressFraction, pageIndex, pageTotal) }
            Box(Modifier.weight(1f).fillMaxWidth()) {
                zones?.content?.let {
                    ZoneBlock(it, branding, moduleSlot, imageContent, styleOf, onButtonAction, progressFraction, pageIndex, pageTotal)
                }
            }
            zones?.footer?.let { ZoneBlock(it, branding, moduleSlot, imageContent, styleOf, onButtonAction, progressFraction, pageIndex, pageTotal) }
        }
        val overlay = zones?.overlay
        if (overlay != null && !overlayDismissed) {
            Box(
                Modifier.fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.55f))
                    .let { m -> if (overlay.fermable) m.clickable { overlayDismissed = true } else m }
                    .padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                ZoneBlock(overlay, branding, moduleSlot, imageContent, styleOf, onButtonAction, progressFraction, pageIndex, pageTotal)
            }
        }
        if (overlay != null && overlay.fermable && overlayDismissed) {
            TextButton(
                onClick = { overlayDismissed = false },
                modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp),
            ) { Text("Message") }
        }
    }
}

@Composable
private fun ZoneBlock(
    zone: ZoneContent,
    branding: Branding?,
    moduleSlot: @Composable () -> Unit,
    imageContent: @Composable (src: String, alt: String?) -> Unit,
    styleOf: (ScreenWidget) -> WidgetStyles,
    onButtonAction: (action: String?) -> Unit,
    progressFraction: Float?,
    pageIndex: Int?,
    pageTotal: Int?,
) {
    // Phase 1 : `stack` pour tous les layouts (grid/free suivront).
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(12.dp)) {
        for (w in zone.widgets) {
            WidgetBlock(w, branding, moduleSlot, imageContent, styleOf(w), onButtonAction, progressFraction, pageIndex, pageTotal)
        }
    }
}

@Composable
private fun WidgetBlock(
    widget: ScreenWidget,
    branding: Branding?,
    moduleSlot: @Composable () -> Unit,
    imageContent: @Composable (src: String, alt: String?) -> Unit,
    style: WidgetStyles,
    onButtonAction: (action: String?) -> Unit,
    progressFraction: Float?,
    pageIndex: Int?,
    pageTotal: Int?,
) {
    val primary = parseHexColor(branding?.primaryColor) ?: MaterialTheme.colorScheme.primary
    when (widget.type) {
        "text" -> Text(
            text = widget.text.orEmpty(),
            color = parseHexColor(style.color) ?: parseHexColor(widget.color) ?: Color.Unspecified,
            fontSize = (style.fontSize ?: widget.fontSize)?.sp ?: MaterialTheme.typography.bodyLarge.fontSize,
            fontWeight = fontWeightOf(style.fontWeight),
            textAlign = textAlignOf(style.align ?: widget.align),
            modifier = Modifier.fillMaxWidth(),
        )
        "image" -> if (!widget.src.isNullOrBlank()) imageContent(widget.src!!, widget.alt)
        "button" -> {
            val label = widget.label.orEmpty()
            val onClick = { onButtonAction(widget.action) }
            when (widget.variant) {
                "secondary" -> OutlinedButton(onClick = onClick) { Text(label) }
                "ghost" -> TextButton(onClick = onClick) { Text(label) }
                else -> Button(onClick = onClick, colors = ButtonDefaults.buttonColors(containerColor = primary)) {
                    Text(label)
                }
            }
        }
        "progress" -> {
            // Fraction explicite prioritaire ; sinon avancement de sous-page.
            val pageFraction = if (pageIndex != null && pageTotal != null && pageTotal > 0) {
                (pageIndex + 1).toFloat() / pageTotal
            } else null
            val fraction = progressFraction ?: pageFraction
            if (widget.showLabel == true) {
                val label = if (progressFraction == null && pageFraction != null && pageIndex != null && pageTotal != null) {
                    "${pageIndex + 1}/$pageTotal"
                } else if (fraction != null) {
                    "${(fraction * 100).toInt()} %"
                } else null
                if (label != null) Text(label, style = MaterialTheme.typography.labelSmall)
            }
            if (fraction != null) LinearProgressIndicator(progress = { fraction }, modifier = Modifier.fillMaxWidth())
            else LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
        }
        "module" -> moduleSlot()
        "spacer" -> Spacer(Modifier.height(spacerHeightDp(widget)))
        // Type inconnu : ignoré gracieusement (jamais de crash joueur).
    }
}
