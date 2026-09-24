plugins {
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.android.library")
    id("com.google.devtools.ksp")
}

// Persistance Room isolée (change player-pwa-shell) : entités + DAOs + base.
// Module séparé (et non source set intermédiaire de :shared) car un
// intermédiaire coutume détache iosMain de ses compilations avec ce
// toolchain. Pas de cible wasmJs : room-runtime n'en publie aucune.
// Entités et base restent dans le même module (contrainte Room KSP).
// :persistence dépend de :shared (modèles du domaine), jamais l'inverse.
kotlin {
    compilerOptions {
        optIn.add("kotlin.time.ExperimentalTime")
    }

    androidTarget {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }

    iosArm64()
    iosX64()
    iosSimulatorArm64()

    jvm()

    sourceSets {
        commonMain.dependencies {
            implementation(project(":shared"))
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
            implementation("androidx.room:room-runtime:2.8.5")
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
        jvmTest.dependencies {
            implementation("androidx.room:room-testing:2.8.5")
            implementation("androidx.sqlite:sqlite-bundled:2.6.2")
            implementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
        }
    }
}

android {
    namespace = "com.geoplay.persistence"
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
    add("kspAndroid", "androidx.room:room-compiler:2.8.5")
    add("kspJvm", "androidx.room:room-compiler:2.8.5")
}
