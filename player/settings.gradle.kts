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
    }
}
rootProject.name = "GeoPlayPlayer"
include(":app")
include(":shared")
include(":persistence")
include(":web")