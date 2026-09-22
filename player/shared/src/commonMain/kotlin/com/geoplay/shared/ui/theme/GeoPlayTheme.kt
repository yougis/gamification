package com.geoplay.shared.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Thème commun du player (change player-kmp-migration, 4.1) : couleurs
// GeoPlay par défaut, police système. Le branding par jeu (primaryColor,
// fontFamily) surcharge ces valeurs à l'usage, jamais en dur dans les écrans.
private val GeoPlayDarkColors = darkColorScheme(
    primary = Color(0xFF1A7F37),
    secondary = Color(0xFF5F3DC4),
    background = Color(0xFF08090B),
    surface = Color(0xFF111318),
    onPrimary = Color(0xFFFFFFFF),
    onBackground = Color(0xFFE8EAED),
    onSurface = Color(0xFFE8EAED),
)

private val GeoPlayLightColors = lightColorScheme(
    primary = Color(0xFF1A7F37),
    secondary = Color(0xFF5F3DC4),
    onPrimary = Color(0xFFFFFFFF),
)

@Composable
fun GeoPlayTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (darkTheme) GeoPlayDarkColors else GeoPlayLightColors,
        typography = Typography(),
        content = content,
    )
}
