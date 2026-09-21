package com.geoplay.shared.pack

/**
 * Vérification d'intégrité d'un pack (offline-pack : le manifest fait foi).
 *
 * Fonction pure : les octets sont fournis par l'appelant (la lecture disque,
 * le ZIP et le réseau restent côté plateforme). Miroir exact de la sémantique
 * Android historique : tailles, SHA-256 minuscule, gating sur erreur.
 *
 * @param manifest manifest de référence.
 * @param files octets par chemin relatif (chemins du manifest absents = manquants).
 * @param onProgress rappel 0..1 (même formule que l'implémentation Android).
 */
fun verifyPackFiles(
    manifest: PackManifest,
    files: Map<String, ByteArray>,
    onProgress: ((Float) -> Unit)? = null,
): PackVerificationResult {
    val errors = mutableListOf<String>()
    val missingFiles = mutableListOf<String>()
    val corruptedFiles = mutableListOf<String>()
    var verifiedBytes = 0L
    val totalBytes = manifest.files.sumOf { it.size }.coerceAtLeast(1L)

    manifest.files.forEachIndexed { index, entry ->
        val bytes = files[entry.path]
        if (bytes == null) {
            missingFiles.add(entry.path)
            errors.add("Fichier manquant: ${entry.path}")
        } else if (bytes.size.toLong() != entry.size) {
            corruptedFiles.add(entry.path)
            errors.add("Fichier corrompu (taille): ${entry.path}")
        } else {
            val sha256 = Sha256.hex(bytes)
            if (sha256 != entry.sha256.lowercase()) {
                corruptedFiles.add(entry.path)
                errors.add("Fichier corrompu (SHA-256): ${entry.path}")
            } else {
                verifiedBytes += entry.size
            }
        }
        onProgress?.invoke((index + 1).toFloat() / manifest.files.size * (if (errors.isEmpty()) 1f else verifiedBytes.toFloat() / totalBytes))
    }

    val progress = if (totalBytes > 0) verifiedBytes.toFloat() / totalBytes else 1f
    val isValid = errors.isEmpty()

    return PackVerificationResult(
        isValid = isValid,
        errors = errors,
        progressPercent = progress,
        missingFiles = missingFiles,
        corruptedFiles = corruptedFiles
    )
}
