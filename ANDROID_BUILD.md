# Android Build Configuration

## Overview
This document outlines the Android-specific build configuration and deployment process for the Hole in One game.

## Platform Requirements
- **Minimum API Level**: 24 (Android 7.0)
- **Target API Level**: 35 (Android 15)
- **Build Tools Version**: 35.0.0

## Build Configuration

### Gradle Configuration
- **Kotlin Version**: 2.0.0
- **Gradle Plugin**: 8.5.0
- **NDK Version**: 27.0.11902837

## Performance Optimizations
1. **Touch Input Optimization**: Simplified touch handling for Android devices
2. **Memory Management**: Optimized asset loading for mobile devices
3. **Battery Efficiency**: Reduced frame rate when app is backgrounded
4. **Network Optimization**: Improved Gemini API response caching

## Device Compatibility
- Supports both portrait and landscape orientations
- Optimized for devices with screen sizes from 4.5" to 6.7"
- Touch gesture support: tap, drag, pinch-to-zoom

## Testing Requirements
- Unit tests using JUnit
- UI tests using Espresso
- Performance testing on devices with varying specs

## Deployment
1. Build signed APK
2. Test on Android devices (API 24-35)
3. Submit to Google Play Store
4. Monitor crash reports and performance metrics
