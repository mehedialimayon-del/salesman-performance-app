plugins { id("com.android.application") }

android {
    namespace = "com.fieldforcehub.mobile"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.fieldforcehub.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 4
        versionName = "1.3-ai-claims"
    }
    signingConfigs {
        create("production") {
            storeFile = file("signing.jks")
            storePassword = System.getenv("FFH_KEYSTORE_PASS") ?: ""
            keyAlias = System.getenv("FFH_KEY_ALIAS") ?: ""
            keyPassword = System.getenv("FFH_KEY_PASS") ?: ""
        }
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            if (file("signing.jks").exists()) {
                signingConfig = signingConfigs.getByName("production")
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("com.onesignal:OneSignal:5.10.2")
}
