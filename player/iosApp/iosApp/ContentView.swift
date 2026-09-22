import SwiftUI
import UniformTypeIdentifiers
import shared

// Écran principal iOS (change player-kmp-migration, 4.4 + 6.6) : héberge
// l'UI Compose du framework `shared`, avec import de pack (fichier JSON)
// pour les testeurs sans Xcode.
struct ContentView: View {
    @State private var gameJson: String? = nil
    @State private var showImporter = false

    var body: some View {
        NavigationStack {
            ComposeView(gameJson: gameJson)
                .ignoresSafeArea()
                .toolbar {
                    Button("Importer") { showImporter = true }
                }
                .fileImporter(
                    isPresented: $showImporter,
                    allowedContentTypes: [.json],
                    allowsMultipleSelection: false
                ) { result in
                    if case .success(let urls) = result, let url = urls.first {
                        gameJson = try? String(contentsOf: url)
                    }
                }
        }
    }
}

struct ComposeView: UIViewControllerRepresentable {
    let gameJson: String?

    func makeUIViewController(context: Context) -> UIViewController {
        if let json = gameJson {
            return MainViewControllerKt.MainViewControllerForGame(gameJson: json)
        }
        return MainViewControllerKt.MainViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
