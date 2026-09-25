import SwiftUI
import UniformTypeIdentifiers
import shared

// Écran principal iOS (change player-kmp-migration, 4.4 + 6.6) : héberge
// l'UI Compose du framework `shared`, avec import de pack (fichier JSON)
// pour les testeurs sans Xcode.
struct ContentView: View {
    @State private var gameJson: String? = nil
    @State private var showImporter = false
    @State private var showCodeImporter = false
    @State private var lienService: String? = nil
    @State private var lienCode: String? = nil

    var body: some View {
        NavigationStack {
            ComposeView(gameJson: gameJson)
                .ignoresSafeArea()
                .toolbar {
                    Button("Code") { showCodeImporter = true }
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
                .sheet(isPresented: $showCodeImporter) {
                    ImportParCode(
                        gameJson: $gameJson,
                        serviceInitial: lienService,
                        codeInitial: lienCode
                    )
                }
                // Deep-link catalogue (change studio-game-catalog, D3) :
                // geoplay://import?code=4217&service=<https> pré-remplit
                // l'écran d'import (même contrat qu'Android et la PWA).
                .onOpenURL { url in
                    guard let composants = URLComponents(url: url, resolvingAgainstBaseURL: false) else { return }
                    let params = composants.queryItems ?? []
                    func valeur(_ nom: String) -> String? {
                        params.first(where: { $0.name == nom })?.value
                    }
                    lienService = valeur("service") ?? valeur("urlService")
                    let brut = valeur("code") ?? ""
                    let chiffres = brut.filter { $0.isNumber }.prefix(4)
                    lienCode = chiffres.isEmpty ? nil : String(chiffres)
                    showCodeImporter = true
                }
        }
    }
}

// Import par code catalogue (change studio-game-catalog, 2.2) : saisie du
// code à 4 chiffres, téléchargement du pack courant, vérification manifest
// via le `shared` KMP (même sémantique qu'Android et la PWA : tailles,
// SHA-256 minuscule, gating sur erreur, fichier fautif nommé). Le réseau
// (URLSession) reste côté plateforme ; après chargement, le jeu tourne
// offline sans jamais recontacter le service.
// Boîte de collecte des octets téléchargés (change studio-game-catalog,
// 2.2) : type référence pour traverser la chaîne de callbacks URLSession
// sans mutation de variable capturée.
private final class CollecteFichiers {
    var fichiers: [String: KotlinByteArray]
    init(_ fichiers: [String: KotlinByteArray]) { self.fichiers = fichiers }
}

struct ImportParCode: View {
    @Binding var gameJson: String?
    var serviceInitial: String? = nil
    var codeInitial: String? = nil
    @Environment(\.dismiss) private var dismiss

    @State private var serviceUrl: String = ""
    @State private var code: String = ""
    @State private var statut: String? = nil
    @State private var erreur: String? = nil
    @State private var occupe = false
    // Réutilisation en session : même service + même code déjà vérifiés →
    // pas de re-téléchargement (miroir PWA lastCodeSource).
    @State private var derniereSource: String? = nil

    private static let cleService = "geoplay.catalogUrl"

    var body: some View {
        NavigationStack {
            Form {
                Section("Catalogue") {
                    TextField("URL du service", text: $serviceUrl)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    TextField("Code du jeu à 4 chiffres", text: $code)
                        .keyboardType(.numberPad)
                }
                Section {
                    Button(occupe ? "Chargement…" : "Charger par code") { charger() }
                        .disabled(occupe || serviceUrl.trimmingCharacters(in: .whitespaces).isEmpty || code.filter({ $0.isNumber }).count != 4)
                }
                if let statut {
                    Section("État") { Text(statut).font(.footnote) }
                }
                if let erreur {
                    Section("Erreur") { Text(erreur).font(.footnote).foregroundColor(.red) }
                }
            }
            .navigationTitle("Importer par code")
            .toolbar {
                Button("Fermer") { dismiss() }
            }
            .onAppear {
                if serviceUrl.isEmpty {
                    serviceUrl = serviceInitial
                        ?? UserDefaults.standard.string(forKey: Self.cleService)
                        ?? ""
                }
                if code.isEmpty, let initial = codeInitial {
                    code = String(initial.filter { $0.isNumber }.prefix(4))
                }
            }
        }
    }

    private func base() -> String {
        serviceUrl.trimmingCharacters(in: .whitespaces).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
    }

    private func charger() {
        let normalise = String(code.filter { $0.isNumber }.prefix(4))
        guard normalise.count == 4 else {
            terminer(erreur: "Saisis les 4 chiffres du code.")
            return
        }
        code = normalise
        let source = "\(base())#/games/\(normalise)"
        if gameJson != nil, derniereSource == source {
            statut = "Pack déjà vérifié (réutilisé, sans re-téléchargement)."
            erreur = nil
            return
        }
        occupe = true
        statut = "Téléchargement du pack…"
        erreur = nil
        UserDefaults.standard.set(serviceUrl.trimmingCharacters(in: .whitespaces), forKey: Self.cleService)
        guard let urlPack = URL(string: "\(base())/games/\(normalise)") else {
            terminer(erreur: "URL du service invalide.")
            return
        }
        URLSession.shared.dataTask(with: urlPack) { donnees, reponse, echec in
            if let echec {
                self.terminer(erreur: "Téléchargement impossible : \(echec.localizedDescription)")
                return
            }
            guard let http = reponse as? HTTPURLResponse else {
                self.terminer(erreur: "Réponse illisible du service.")
                return
            }
            guard http.statusCode == 200, let donnees else {
                self.terminer(erreur: http.statusCode == 404 ? "code inconnu" : "Téléchargement refusé : HTTP \(http.statusCode)")
                return
            }
            self.ingérer(packDonnees: donnees, code: normalise, source: source)
        }.resume()
    }

    private func ingérer(packDonnees: Data, code: String, source: String) {
        guard let racine = (try? JSONSerialization.jsonObject(with: packDonnees)) as? [String: Any],
              let gameText = racine["gameJson"] as? String,
              let manifestDict = racine["manifest"] as? [String: Any],
              let entrees = manifestDict["files"] as? [[String: Any]],
              entrees.allSatisfy({ ($0["path"] as? String) != nil && ($0["sha256"] as? String) != nil && ($0["size"] as? NSNumber) != nil }),
              let manifestData = try? JSONSerialization.data(withJSONObject: manifestDict),
              let manifestText = String(data: manifestData, encoding: .utf8),
              let gameData = gameText.data(using: .utf8)
        else {
            terminer(erreur: "Pack illisible (code \(code)).")
            return
        }
        var fichiers: [String: KotlinByteArray] = ["game.json": tableauKotlin(gameData)]
        let aTelecharger = entrees.compactMap { $0["path"] as? String }.filter { $0 != "game.json" }
        telechargerAssets(
            base: base(), code: code, chemins: aTelecharger, index: 0,
            collecte: CollecteFichiers(fichiers), gameText: gameText, manifestText: manifestText, source: source
        )
    }

    private func telechargerAssets(
        base: String, code: String, chemins: [String], index: Int,
        collecte: CollecteFichiers, gameText: String, manifestText: String, source: String
    ) {
        guard index < chemins.count else {
            verifier(gameText: gameText, manifestText: manifestText, fichiers: collecte.fichiers, source: source)
            return
        }
        let chemin = chemins[index]
        majStatut("Téléchargement \(index + 1)/\(chemins.count) : \(chemin)")
        var composants = URLComponents(string: "\(base)/games/\(code)/assets")!
        // Chaque segment est encodé séparément (les `/` du chemin restent des séparateurs).
        composants.percentEncodedPath += "/" + chemin.split(separator: "/").map {
            $0.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String($0)
        }.joined(separator: "/")
        guard let url = composants.url else {
            terminer(erreur: "Asset illisible (code \(code)) : \(chemin)")
            return
        }
        URLSession.shared.dataTask(with: url) { donnees, reponse, echec in
            guard echec == nil,
                  let http = reponse as? HTTPURLResponse, http.statusCode == 200,
                  let donnees
            else {
                self.terminer(erreur: "Asset manquant (code \(code)) : \(chemin)")
                return
            }
            collecte.fichiers[chemin] = self.tableauKotlin(donnees)
            self.telechargerAssets(
                base: base, code: code, chemins: chemins, index: index + 1,
                collecte: collecte, gameText: gameText, manifestText: manifestText, source: source
            )
        }.resume()
    }

    private func verifier(gameText: String, manifestText: String, fichiers: [String: KotlinByteArray], source: String) {
        // Ne lève jamais (contrat verifyPackJson) : invalide nommé sinon.
        let resultat = PackVerifierKt.verifyPackJson(manifestText: manifestText, files: fichiers as NSDictionary)
        let motifs = (resultat.errors as? [String]) ?? []
        guard resultat.isValid else {
            terminer(erreur: "Pack refusé (code \(code)) : \(motifs.joined(separator: " ; "))")
            return
        }
        DispatchQueue.main.async {
            self.gameJson = gameText
            self.derniereSource = source
            self.statut = "Pack vérifié : jeu démarrable offline."
            self.erreur = nil
            self.occupe = false
            self.dismiss()
        }
    }

    private func tableauKotlin(_ data: Data) -> KotlinByteArray {
        let t = KotlinByteArray(size: Int32(data.count))
        var i: Int32 = 0
        for octet in data {
            t.set(index: i, value: Int8(bitPattern: octet))
            i += 1
        }
        return t
    }

    private func majStatut(_ texte: String) {
        DispatchQueue.main.async { self.statut = texte }
    }

    private func terminer(erreur texte: String) {
        DispatchQueue.main.async {
            self.erreur = texte
            self.statut = nil
            self.occupe = false
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
