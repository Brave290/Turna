# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# Hermes
-keep class com.facebook.jni.HermesWeakMap { *; }

# OkHttp / Supabase (if used later)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Generic
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-keepclassmembers class * {
  @android.webkit.JavascriptInterface <methods>;
}
