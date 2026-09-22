// Point d'entree UIKit du framework shared (change player-kmp-migration,
// 4.4). Package racine volontaire : la facade ObjC s'appelle exactement
// `MainViewControllerKt`, appelable depuis Swift sans préfixe de package.
// Zéro argument (les paramètres par défaut Kotlin ne traversent pas Swift,
// cf. skill kmp-native-boundary) ; le JSON transite en String.
import androidx.compose.ui.window.ComposeUIViewController
import com.geoplay.shared.model.Game
import com.geoplay.shared.ui.navigation.GeoPlayApp
import kotlinx.serialization.json.Json
import platform.UIKit.UIViewController

private val gameJsonCodec = Json { ignoreUnknownKeys = true }

fun MainViewController(): UIViewController = ComposeUIViewController {
    GeoPlayApp(game = Game(gameId = "demo"), states = emptyMap(), onQuizComplete = { _, _ -> })
}

fun MainViewControllerForGame(gameJson: String): UIViewController {
    val game = try {
        gameJsonCodec.decodeFromString(Game.serializer(), gameJson)
    } catch (_: Exception) {
        Game(gameId = "invalide")
    }
    return ComposeUIViewController {
        GeoPlayApp(game = game, states = emptyMap(), onQuizComplete = { _, _ -> })
    }
}
