pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    // PREFER_SETTINGS (et non FAIL_ON_PROJECT_REPOS) : le toolchain
    // Kotlin/JS-Wasm provisionne node/yarn/binaryen via des dépôts Ivy
    // ajoutés par le plugin — incompatibles avec le mode strict. Les
    // dépendances applicatives restent résolues en priorité depuis
    // google()/mavenCentral() ci-dessous (change player-pwa-shell).
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        // Toolchain Kotlin/JS-Wasm (change player-pwa-ci-pages, KGP 2.2.21) :
        // le plugin ajoute ces memes depots Ivy a l'execution
        // (AbstractSetupTask.withUrlRepo), ignores sous PREFER_SETTINGS.
        // Declares ici, ils sont toujours consultes. Les filtres
        // includeModule garantissent qu'aucune dependance applicative
        // ne peut s'y resoudre.
        ivy {
            name = "kotlin-yarn"
            url = uri("https://github.com/yarnpkg/yarn/releases/download")
            patternLayout { artifact("v[revision]/[artifact](-v[revision]).[ext]") }
            metadataSources { artifact() }
            content { includeModule("com.yarnpkg", "yarn") }
        }
        ivy {
            name = "kotlin-nodejs"
            url = uri("https://nodejs.org/dist")
            patternLayout { artifact("v[revision]/[artifact](-v[revision]-[classifier]).[ext]") }
            metadataSources { artifact() }
            content { includeModule("org.nodejs", "node") }
        }
        ivy {
            name = "kotlin-binaryen"
            url = uri("https://github.com/WebAssembly/binaryen/releases/download")
            patternLayout { artifact("version_[revision]/binaryen-version_[revision]-[classifier].[ext]") }
            metadataSources { artifact() }
            content { includeModule("com.github.webassembly", "binaryen") }
        }
    }
}
rootProject.name = "GeoPlayPlayer"
include(":app")
include(":shared")
include(":persistence")
include(":web")