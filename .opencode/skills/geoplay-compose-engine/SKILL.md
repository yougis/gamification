---
name: "geoplay-compose-engine"
description: "Génère l'interpréteur d'écrans Compose Multiplatform et les scripts d'interopérabilité JS/Kotlin pour le simulateur Wasm"
compatibility: ["opencode-v2"]
---

# Directives de génération de code Compose Multiplatform

Lorsque vous appliquez un changement de type code (`/opsx:apply`), vous devez strictement vous conformer aux structures suivantes :

## 1. Structure de l'Interpréteur de Nœuds (commonMain)
Le point d'entrée visuel du moteur reçoit l'état d'affichage calculé à partir du JSON OpenSpec.

```kotlin
package com.geoplay.engine.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.geoplay.engine.model.NodeData

@Composable
fun NodeRuntimeRenderer(node: NodeData, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize()) {
        when (node.widgetType) {
            "QUIZ" -> QuizModuleView(data = node.moduleData)
            "BOUSSOLE" -> BoussoleModuleView(data = node.moduleData)
            "DIFFERENCE_GAME" -> DifferenceGameView(data = node.moduleData)
            else -> DefaultFallbackView(message = "Module inconnu ou non supporté")
        }
    }
}
```

## 2. Structure du Pont de Simulation Window (wasmJsMain)
Ce code permet à la version WebAssembly de s'interfacer avec le `postMessage` envoyé par le Studio de création en React.

```kotlin
package com.geoplay.engine.simulator

import kotlinx.browser.window
import org.w3c.dom.events.Event
import org.w3c.dom.events.MessageEvent

class WasmSimulatorBridge(private val onSpecUpdated: (String) -> Unit) {
    
    fun startListening() {
        window.addEventListener("message", { event ->
            val messageEvent = event as MessageEvent
            val data = messageEvent.data.asJsObject()
            
            // Extraction sécurisée selon la spécification du pont
            if (data.get("type").toString() == "UPDATE_GAME_SPEC") {
                val jsonPayload = data.get("payload").toString()
                onSpecUpdated(jsonPayload)
            }
        })
    }
}

// Extension utilitaire pour l'accès dynamique aux propriétés JS
private fun Any?.asJsObject(): kotlin.js.Json = this.asDynamic() as kotlin.js.Json
```
