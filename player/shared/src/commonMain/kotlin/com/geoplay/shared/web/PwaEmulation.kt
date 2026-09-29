package com.geoplay.shared.web

// Paramètres d'émulation PWA (change preview-pwa-iframe) : `?game=<url>`
// (auto-chargement), `?cheat=1` (triche pré-ouverte), `?session=<id>`
// (isolement du stockage). Pur et testé en commonTest ; la coquille web
// (`Main.kt`) ne fait que lire `window.location.search` et appeler ici.

/** Décodage percent-encoding pur Kotlin (sans interop JS), assemblé en UTF-8
 * (les séquences `%C3%A2` donnent `â`, pas du Latin-1). Identique à
 * l'ancien décodeur inline sur tout contenu ASCII (`?code`, `?service`). */
fun decoderParamQuery(search: String, nom: String): String {
    val raw = search.split("&", "?").firstOrNull { it.startsWith("$nom=") }
        ?.substringAfter("=") ?: return ""
    val buf = ArrayList<Byte>(raw.length)
    var i = 0
    while (i < raw.length) {
        val c = raw[i]
        if (c == '%' && i + 2 < raw.length) {
            val v = raw.substring(i + 1, i + 3).toIntOrNull(16)
            if (v != null) {
                buf.add(v.toByte())
                i += 3
                continue
            }
        }
        var cp = (if (c == '+') ' ' else c).code
        // Paires de substitution (plan astral) : combiner avant encodage.
        if (cp in 0xD800..0xDBFF && i + 1 < raw.length) {
            val bas = raw[i + 1].code
            if (bas in 0xDC00..0xDFFF) {
                cp = 0x10000 + ((cp - 0xD800) shl 10) + (bas - 0xDC00)
                i++
            }
        }
        when {
            cp < 0x80 -> buf.add(cp.toByte())
            cp < 0x800 -> {
                buf.add((0xC0 or (cp shr 6)).toByte())
                buf.add((0x80 or (cp and 0x3F)).toByte())
            }
            cp < 0x10000 -> {
                buf.add((0xE0 or (cp shr 12)).toByte())
                buf.add((0x80 or ((cp shr 6) and 0x3F)).toByte())
                buf.add((0x80 or (cp and 0x3F)).toByte())
            }
            else -> {
                buf.add((0xF0 or (cp shr 18)).toByte())
                buf.add((0x80 or ((cp shr 12) and 0x3F)).toByte())
                buf.add((0x80 or ((cp shr 6) and 0x3F)).toByte())
                buf.add((0x80 or (cp and 0x3F)).toByte())
            }
        }
        i++
    }
    // Décodage UTF-8 manuel (commonMain).
    val out = StringBuilder()
    var j = 0
    fun octet(k: Int): Int = buf.getOrElse(k) { 0 }.toInt() and 0xFF
    while (j < buf.size) {
        val b0 = octet(j)
        val (cp, taille) = when {
            b0 and 0x80 == 0 -> b0 to 1
            b0 and 0xE0 == 0xC0 -> ((b0 and 0x1F) shl 6) or (octet(j + 1) and 0x3F) to 2
            b0 and 0xF0 == 0xE0 -> ((b0 and 0x0F) shl 12) or ((octet(j + 1) and 0x3F) shl 6) or (octet(j + 2) and 0x3F) to 3
            b0 and 0xF8 == 0xF0 -> ((b0 and 0x07) shl 18) or ((octet(j + 1) and 0x3F) shl 12) or ((octet(j + 2) and 0x3F) shl 6) or (octet(j + 3) and 0x3F) to 4
            else -> b0 to 1
        }
        if (cp > 0xFFFF) {
            val v = cp - 0x10000
            out.append((0xD800 + (v shr 10)).toChar())
            out.append((0xDC00 + (v and 0x3FF)).toChar())
        } else {
            out.append(cp.toChar())
        }
        j += taille
    }
    return out.toString()
}

/** URL du pack à auto-charger (`?game=`), vide si absent. */
fun urlJeuEmulation(search: String): String = decoderParamQuery(search, "game")

/** Triche pré-ouverte (`?cheat=1` strict, le reste = fermée). */
fun trichePreOuverte(search: String): Boolean = decoderParamQuery(search, "cheat") == "1"

/** Namespace de session (`?session=`, `defaut` sinon). */
fun namespaceSession(search: String): String {
    val ns = decoderParamQuery(search, "session").trim()
    return if (ns.isBlank()) "defaut" else ns
}

/**
 * Clé de stockage d'une session émulée : namespacée pour ne jamais
 * polluer les vraies parties (`geoplay.web.session.<gameId>` inchangé).
 */
fun cleSessionEmulee(namespace: String, gameId: String): String =
    "geoplay.web.session.emulate.$namespace.$gameId"
