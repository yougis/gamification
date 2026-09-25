package com.geoplay.shared.ui.screen

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.geoplay.shared.model.ScreenWidget
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ScreenRendererCommonTest {

    @Test
    fun parseHexColorSupportsShortLongAndAlpha() {
        assertEquals(Color(0xFF8B0000), parseHexColor("#8B0000"))
        assertEquals(Color(0xFF880000), parseHexColor("#800"))
        assertEquals(Color(0x80112233), parseHexColor("#80112233"))
        assertNull(parseHexColor(null))
        assertNull(parseHexColor("#zzz"))
        assertNull(parseHexColor("#12345"))
    }

    @Test
    fun textAlignDefaultsLeft() {
        assertEquals(TextAlign.Center, textAlignOf("center"))
        assertEquals(TextAlign.Right, textAlignOf("right"))
        assertEquals(TextAlign.Left, textAlignOf(null))
        assertEquals(TextAlign.Left, textAlignOf("justify"))
    }

    @Test
    fun spacerHeightReadsNumberAndString() {
        assertEquals(16.dp, spacerHeightDp(ScreenWidget(type = "spacer", height = JsonPrimitive(16))))
        assertEquals(24.dp, spacerHeightDp(ScreenWidget(type = "spacer", height = JsonPrimitive("24dp"))))
        assertEquals(8.dp, spacerHeightDp(ScreenWidget(type = "spacer")))
    }
}
