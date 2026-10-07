plugins { id("com.android.application") }

android {
    namespace = "com.fieldforcehub.mobile"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.fieldforcehub.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 9
        versionName = "1.8"
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
    testOptions { unitTests.isIncludeAndroidResources = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.15.1")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("com.onesignal:OneSignal:5.10.2")
}
