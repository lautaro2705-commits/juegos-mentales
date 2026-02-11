# FutbolPro - Índice de Archivos

## 📂 Estructura del Proyecto

```
FutbolPro/
│
├── 📄 Documentación (4 archivos)
│   ├── README.md                    - Documentación principal
│   ├── QUICKSTART.md                - Guía de inicio rápido
│   ├── ARCHITECTURE.md              - Arquitectura técnica
│   ├── PROJECT_SUMMARY.md           - Resumen del proyecto
│   └── FILE_INDEX.md                - Este archivo
│
├── ⚙️ Configuración (2 archivos)
│   └── FutbolPro.entitlements       - Permisos iOS HealthKit
│
├── 📁 Shared/ (4 archivos) - TARGETS: iOS + Watch
│   ├── Match.swift                  - Modelos de datos
│   ├── MatchViewModel.swift         - Lógica de negocio principal
│   ├── HealthKitManager.swift       - Integración HealthKit
│   └── WatchConnectivityManager.swift - Comunicación iPhone-Watch
│
├── 📁 iOS/ (7 archivos) - TARGET: iOS
│   ├── FutbolProApp.swift          - Entry point iOS
│   ├── ContentView.swift            - Coordinador de navegación
│   ├── MatchSetupView.swift         - Configuración inicial
│   ├── MatchDashboardView.swift     - Dashboard principal
│   ├── MatchHistoryView.swift       - Historial de partidos
│   ├── Extensions.swift             - Extensiones de Color
│   └── Info.plist                   - Permisos y configuración iOS
│
└── 📁 Watch/ (5 archivos) - TARGET: Watch
    ├── WatchApp.swift               - Entry point Watch
    ├── WatchMatchView.swift         - Interfaz Watch (3 tabs)
    ├── WatchMatchViewModel.swift    - ViewModel Watch
    ├── WatchConnectivityManager+Watch.swift - Extensión Watch
    └── Info.plist                   - Configuración Watch
```

---

## 📋 Archivos por Categoría

### 1. Entry Points (Inicio de la App)

| Archivo | Target | Líneas | Descripción |
|---------|--------|--------|-------------|
| `iOS/FutbolProApp.swift` | iOS | ~40 | Entry point iOS, inicializa ViewModels |
| `Watch/WatchApp.swift` | Watch | ~25 | Entry point Watch, configura vistas |

---

### 2. Modelos de Datos

| Archivo | Target | Líneas | Descripción |
|---------|--------|--------|-------------|
| `Shared/Match.swift` | iOS + Watch | ~60 | Struct Match, enum MatchPeriod |

---

### 3. ViewModels (Lógica de Negocio)

| Archivo | Target | Líneas | Descripción |
|---------|--------|--------|-------------|
| `Shared/MatchViewModel.swift` | iOS + Watch | ~250 | ViewModel principal, gestión de partido |
| `Watch/WatchMatchViewModel.swift` | Watch | ~100 | ViewModel específico para Watch |

---

### 4. Servicios e Integraciones

| Archivo | Target | Líneas | Descripción |
|---------|--------|--------|-------------|
| `Shared/HealthKitManager.swift` | iOS + Watch | ~200 | Integración HealthKit (BPM, calorías) |
| `Shared/WatchConnectivityManager.swift` | iOS + Watch | ~150 | Comunicación iPhone-Watch |
| `Watch/WatchConnectivityManager+Watch.swift` | Watch | ~50 | Extensión específica Watch |

---

### 5. Vistas SwiftUI - iOS

| Archivo | Target | Líneas | Descripción |
|---------|--------|--------|-------------|
| `iOS/ContentView.swift` | iOS | ~50 | Coordinador principal (Setup vs Dashboard) |
| `iOS/MatchSetupView.swift` | iOS | ~150 | Configuración inicial del partido |
| `iOS/MatchDashboardView.swift` | iOS | ~350 | Dashboard con marcador, cronómetro, salud |
| `iOS/MatchHistoryView.swift` | iOS | ~200 | Historial de partidos guardados |

---

### 6. Vistas SwiftUI - Watch

| Archivo | Target | Líneas | Descripción |
|---------|--------|--------|-------------|
| `Watch/WatchMatchView.swift` | Watch | ~180 | Interfaz principal Watch (3 tabs) |

---

### 7. Extensiones y Utilidades

| Archivo | Target | Líneas | Descripción |
|---------|--------|--------|-------------|
| `iOS/Extensions.swift` | iOS | ~10 | Color.neonGreen personalizado |

---

### 8. Configuración

| Archivo | Target | Tipo | Descripción |
|---------|--------|------|-------------|
| `iOS/Info.plist` | iOS | XML | Permisos HealthKit iOS |
| `Watch/Info.plist` | Watch | XML | Configuración Watch |
| `FutbolPro.entitlements` | iOS | XML | Entitlements HealthKit |

---

### 9. Documentación

| Archivo | Propósito |
|---------|-----------|
| `README.md` | Documentación completa del proyecto |
| `QUICKSTART.md` | Guía rápida de configuración (5 min) |
| `ARCHITECTURE.md` | Arquitectura técnica detallada |
| `PROJECT_SUMMARY.md` | Resumen ejecutivo del proyecto |
| `FILE_INDEX.md` | Este archivo, índice de todos los archivos |

---

## 🎯 Target Membership

### Archivos Compartidos (iOS + Watch)
**Importante**: Estos archivos DEBEN tener ambos targets marcados en Xcode

```
✓ FutbolPro (iOS)
✓ FutbolPro Watch App

Archivos:
- Shared/Match.swift
- Shared/MatchViewModel.swift
- Shared/HealthKitManager.swift
- Shared/WatchConnectivityManager.swift
```

### Archivos Solo iOS
**Importante**: Estos archivos SOLO deben tener el target iOS

```
✓ FutbolPro (iOS)
✗ FutbolPro Watch App

Archivos:
- iOS/FutbolProApp.swift
- iOS/ContentView.swift
- iOS/MatchSetupView.swift
- iOS/MatchDashboardView.swift
- iOS/MatchHistoryView.swift
- iOS/Extensions.swift
- iOS/Info.plist
```

### Archivos Solo Watch
**Importante**: Estos archivos SOLO deben tener el target Watch

```
✗ FutbolPro (iOS)
✓ FutbolPro Watch App

Archivos:
- Watch/WatchApp.swift
- Watch/WatchMatchView.swift
- Watch/WatchMatchViewModel.swift
- Watch/WatchConnectivityManager+Watch.swift
- Watch/Info.plist
```

---

## 📝 Descripción Detallada de Cada Archivo

### Shared/Match.swift
```swift
// Propósito: Define los modelos de datos
// Contenido:
//   - struct Match: Representa un partido completo
//   - enum MatchPeriod: Duración del partido (20/45/90 min)
// Usado por: iOS y Watch
// Dependencies: Foundation
```

### Shared/MatchViewModel.swift
```swift
// Propósito: Lógica de negocio principal del partido
// Responsabilidades:
//   - Gestionar estado del partido (equipos, marcador, tiempo)
//   - Control del cronómetro
//   - Integración con HealthKitManager
//   - Persistencia del historial
// Usado por: iOS (principal), Watch (actualizaciones)
// Dependencies: Foundation, Combine
```

### Shared/HealthKitManager.swift
```swift
// Propósito: Interfaz con HealthKit
// Responsabilidades:
//   - Solicitar permisos
//   - Monitorear frecuencia cardíaca en tiempo real
//   - Calcular calorías quemadas
//   - Obtener promedios al finalizar
// Usado por: iOS y Watch
// Dependencies: HealthKit, Combine
```

### Shared/WatchConnectivityManager.swift
```swift
// Propósito: Sincronización iPhone-Watch
// Responsabilidades:
//   - Establecer sesión WatchConnectivity
//   - Enviar estado del partido (iPhone → Watch)
//   - Recibir eventos de goles (Watch → iPhone)
//   - Gestionar conexión
// Usado por: iOS y Watch
// Dependencies: WatchConnectivity, Foundation
```

### iOS/FutbolProApp.swift
```swift
// Propósito: Entry point iOS
// Responsabilidades:
//   - Inicializar ViewModels
//   - Configurar EnvironmentObjects
//   - Solicitar permisos HealthKit
//   - Activar WatchConnectivity
// Dependencies: SwiftUI
```

### iOS/ContentView.swift
```swift
// Propósito: Coordinador de navegación
// Responsabilidades:
//   - Decidir qué vista mostrar (Setup vs Dashboard)
//   - Gestionar navegación al historial
// Dependencies: SwiftUI
```

### iOS/MatchSetupView.swift
```swift
// Propósito: Configuración inicial del partido
// Componentes:
//   - TextFields para nombres de equipos
//   - Picker para duración
//   - Botón "Iniciar Partido"
// Dependencies: SwiftUI
```

### iOS/MatchDashboardView.swift
```swift
// Propósito: Dashboard principal durante el partido
// Componentes:
//   - HealthStatsBar (BPM, calorías)
//   - TimerDisplay (cronómetro grande)
//   - ScoreBoard (marcador + botones +1)
//   - ControlButtons (Play/Pause/Reset)
//   - BottomControls (Tiempo Extra, Finalizar)
// Dependencies: SwiftUI
```

### iOS/MatchHistoryView.swift
```swift
// Propósito: Historial de partidos guardados
// Componentes:
//   - Lista con MatchHistoryRow
//   - EmptyHistoryView si no hay datos
//   - Swipe-to-delete
// Dependencies: SwiftUI
```

### iOS/Extensions.swift
```swift
// Propósito: Extensiones de utilidad
// Contenido:
//   - Color.neonGreen
// Dependencies: SwiftUI
```

### Watch/WatchApp.swift
```swift
// Propósito: Entry point Watch
// Responsabilidades:
//   - Inicializar ViewModels Watch
//   - Configurar EnvironmentObjects
//   - Activar WatchConnectivity
// Dependencies: SwiftUI
```

### Watch/WatchMatchView.swift
```swift
// Propósito: Interfaz principal Watch
// Estructura:
//   - TabView con 3 pestañas:
//     1. TimerTabView (cronómetro)
//     2. ScoreTabView (marcador)
//     3. HealthTabView (salud)
// Dependencies: SwiftUI
```

### Watch/WatchMatchViewModel.swift
```swift
// Propósito: ViewModel específico Watch
// Responsabilidades:
//   - Mantener estado local
//   - Enviar eventos de goles al iPhone
//   - Recibir actualizaciones del iPhone
// Dependencies: Foundation, WatchConnectivity
```

### Watch/WatchConnectivityManager+Watch.swift
```swift
// Propósito: Extensión Watch para manejar mensajes
// Responsabilidades:
//   - Parsear mensajes "matchState"
//   - Publicar notificaciones locales
// Dependencies: Foundation, WatchConnectivity
```

---

## 🔍 Búsqueda Rápida

### Por Funcionalidad

**Cronómetro**:
- `Shared/MatchViewModel.swift` - Lógica
- `iOS/MatchDashboardView.swift` - Vista iOS
- `Watch/WatchMatchView.swift` - Vista Watch (TimerTabView)

**Marcador**:
- `Shared/MatchViewModel.swift` - Lógica
- `iOS/MatchDashboardView.swift` - ScoreBoard
- `Watch/WatchMatchView.swift` - ScoreTabView

**HealthKit**:
- `Shared/HealthKitManager.swift` - Integración
- `iOS/MatchDashboardView.swift` - HealthStatsBar
- `Watch/WatchMatchView.swift` - HealthTabView
- `iOS/Info.plist` - Permisos

**WatchConnectivity**:
- `Shared/WatchConnectivityManager.swift` - Base
- `Watch/WatchConnectivityManager+Watch.swift` - Extensión Watch
- `iOS/MatchDashboardView.swift` - Observers

**Persistencia**:
- `Shared/Match.swift` - Modelo Codable
- `Shared/MatchViewModel.swift` - UserDefaults
- `iOS/MatchHistoryView.swift` - Vista

---

## 📊 Estadísticas del Proyecto

| Métrica | Valor |
|---------|-------|
| Total de Archivos Swift | 13 |
| Total de Vistas SwiftUI | 12 |
| Total de ViewModels | 2 |
| Total de Services | 2 |
| Total de Archivos Config | 3 |
| Total de Documentación | 5 |
| **TOTAL ARCHIVOS** | **23** |

---

## ✅ Checklist de Configuración en Xcode

Al importar estos archivos a Xcode, verifica:

### Archivos Shared/
- [ ] Match.swift → Target Membership: iOS ✓, Watch ✓
- [ ] MatchViewModel.swift → Target Membership: iOS ✓, Watch ✓
- [ ] HealthKitManager.swift → Target Membership: iOS ✓, Watch ✓
- [ ] WatchConnectivityManager.swift → Target Membership: iOS ✓, Watch ✓

### Archivos iOS/
- [ ] FutbolProApp.swift → Target Membership: iOS ✓
- [ ] ContentView.swift → Target Membership: iOS ✓
- [ ] MatchSetupView.swift → Target Membership: iOS ✓
- [ ] MatchDashboardView.swift → Target Membership: iOS ✓
- [ ] MatchHistoryView.swift → Target Membership: iOS ✓
- [ ] Extensions.swift → Target Membership: iOS ✓
- [ ] Info.plist → Target: iOS

### Archivos Watch/
- [ ] WatchApp.swift → Target Membership: Watch ✓
- [ ] WatchMatchView.swift → Target Membership: Watch ✓
- [ ] WatchMatchViewModel.swift → Target Membership: Watch ✓
- [ ] WatchConnectivityManager+Watch.swift → Target Membership: Watch ✓
- [ ] Info.plist → Target: Watch

### Capabilities
- [ ] iOS: HealthKit capability agregado
- [ ] iOS: Background Modes capability agregado
- [ ] Watch: HealthKit capability agregado

### Entitlements
- [ ] FutbolPro.entitlements creado y vinculado a iOS target
- [ ] Watch App entitlements configurado (opcional)

---

## 🎉 ¡Proyecto Completo!

Todos los archivos están listos para ser importados a Xcode.

**Siguiente paso**: Lee `QUICKSTART.md` para configurar el proyecto en 5 minutos.

---

**Última actualización**: 2025-02-09
