package com.geoplay.shared.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable

/**
 * Minimal Compose Multiplatform entry point.
 * Full theme / navigation / screens arrive in phase 4 (tasks 4.1-4.4).
 */
@Composable
fun GeoPlayPlaceholderScreen(gameName: String) {
    MaterialTheme {
        Text(text = "GeoPlay — $gameName")
    }
}
