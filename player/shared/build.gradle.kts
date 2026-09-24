plugins {
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.compose")
    id("com.android.library")
    id("com.google.devtools.ksp")
}

kotlin {
    compilerOptions {
        optIn.add("kotlin.time.ExperimentalTime")
    }

    androidTarget {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    iosArm64 {
        binaries.framework {
            baseName = "shared"
        }
    }
    iosX64 {
        binaries.framework {
            baseName = "shared"
        }
    }
    iosSimulatorArm64 {
        binaries.framework {
            baseName = "shared"
        }
    }

    jvm()

    // Cible navigateur (PWA) : pas de Room ici (room-runtime n'a aucun
    // variant wasmJs) — persistance web en clé-valeur, voir design D2.
    wasmJs {
        browser { }
        binaries.executable()
    }

    sourceSets {
        commonMain.dependencies {
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.8.1")
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
            implementation(compose.runtime)
            implementation(compose.ui)
            implementation(compose.foundation)
            implementation(compose.material3)
            implementation("org.jetbrains.androidx.navigation:navigation-compose:2.9.2")
        }

        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
        }
        jvmTest.dependencies {
            implementation("androidx.room:room-testing:2.8.5")
            implementation("androidx.sqlite:sqlite-bundled:2.6.2")
        }
        androidMain.dependencies {
            implementation("androidx.core:core-ktx:1.13.1")
        }
        iosMain.dependencies {
            implementation("org.jetbrains.compose.ui:ui-uikit:1.10.3")
        }
    }
}

android {
    namespace = "com.geoplay.shared"
    compileSdk = 35

    defaultConfig {
        minSdk = 24
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Room KMP : implémentations générées une fois par cible JVM/Android,
    // câblées dans le graphe de compilation de la cible.
    // kspCommonMainMetadata (métadonnées pour cibles natives/iOS) est
    // volontairement absent : sa sortie entrait en conflit (actual en double)
    // avec les implémentations par cible. Il reviendra en phase 3/6.x où le
    // link .framework sera vérifié pour de vrai sur runner macOS.
    add("kspAndroid", "androidx.room:room-compiler:2.8.5")
    add("kspJvm", "androidx.room:room-compiler:2.8.5")
}
