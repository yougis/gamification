package com.geoplay.shared.web

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PwaEmulationTest {

    @Test
    fun decodageQuery() {
        assertEquals("4217", decoderParamQuery("?code=4217&service=x", "code"))
        assertEquals("a b", decoderParamQuery("?n=a+b", "n"))
        assertEquals("Château", decoderParamQuery("?n=Ch%C3%A2teau", "n"))
        assertEquals("café ☕", decoderParamQuery("?n=caf%C3%A9+%E2%98%95", "n"))
        assertEquals("Château", decoderParamQuery("?n=Château", "n"))
        assertEquals("", decoderParamQuery("?code=4217", "game"))
        assertEquals("", decoderParamQuery("", "game"))
        assertEquals("x", decoderParamQuery("?a=%ZZ&game=x", "game"))
    }

    @Test
    fun urlJeu() {
        val url = "http://localhost:5173/emulate/game.json"
        assertEquals(url, urlJeuEmulation("?game=${url.replace(":", "%3A").replace("/", "%2F")}"))
        assertEquals("", urlJeuEmulation("?code=4217"))
    }

    @Test
    fun tricheStrict1() {
        assertTrue(trichePreOuverte("?cheat=1"))
        assertTrue(trichePreOuverte("?game=x&cheat=1"))
        assertFalse(trichePreOuverte("?cheat=0"))
        assertFalse(trichePreOuverte("?cheat=yes"))
        assertFalse(trichePreOuverte(""))
    }

    @Test
    fun namespaceSession() {
        assertEquals("defaut", namespaceSession(""))
        assertEquals("defaut", namespaceSession("?game=x"))
        assertEquals("auteur-2", namespaceSession("?session=auteur-2"))
    }

    @Test
    fun cleIsoleeDesVraiesParties() {
        val emulee = cleSessionEmulee("defaut", "jeu-x")
        assertEquals("geoplay.web.session.emulate.defaut.jeu-x", emulee)
        assertFalse(emulee == "geoplay.web.session.jeu-x")
        assertTrue(cleSessionEmulee("a", "j") != cleSessionEmulee("b", "j"))
    }
}
