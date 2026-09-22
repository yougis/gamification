import SwiftUI

// Point d'entrée de l'app iOS GeoPlay (change player-kmp-migration, 4.4).
// Toute la logique vient du framework KMP `shared` ; SwiftUI n'héberge que
// la coquille (navigation, import de fichier) autour de Compose.
@main
struct iOSApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
