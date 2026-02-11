# FutbolPro - Arquitectura del Proyecto

## 📐 Arquitectura General

FutbolPro sigue el patrón **MVVM (Model-View-ViewModel)** con una arquitectura compartida entre iOS y watchOS.

```
┌─────────────────────────────────────────────┐
│              User Interface                 │
│  ┌─────────────┐        ┌────────────────┐ │
│  │   iPhone    │   ←→   │  Apple Watch   │ │
│  │   SwiftUI   │        │    SwiftUI     │ │
│  └─────────────┘        └────────────────┘ │
└──────────────┬──────────────┬──────────────┘
               │              │
               ▼              ▼
┌─────────────────────────────────────────────┐
│           ViewModels Layer                  │
│  ┌──────────────────────────────────────┐   │
│  │  MatchViewModel (Lógica de negocio)  │   │
│  │  WatchMatchViewModel (Watch-specific)│   │
│  └──────────────────────────────────────┘   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│           Services Layer                    │
│  ┌───────────────┐  ┌──────────────────┐   │
│  │  HealthKit    │  │ WatchConnectivity│   │
│  │   Manager     │  │     Manager      │   │
│  └───────────────┘  └──────────────────┘   │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│            Data Layer                       │
│  ┌───────────┐  ┌─────────────────────┐    │
│  │  Models   │  │  UserDefaults       │    │
│  │  (Match)  │  │  (Persistence)      │    │
│  └───────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos

### **Shared/** (Código Compartido)

#### `Match.swift`
**Propósito**: Define los modelos de datos

- `Match`: Estructura que representa un partido completo
  - Equipos, puntajes, duración
  - Estadísticas de salud (BPM, calorías)
  - Fechas de inicio/fin

- `MatchPeriod`: Enum para duración del partido (20, 45, 90 min)

**Usado por**: iOS y Watch

---

#### `MatchViewModel.swift`
**Propósito**: Lógica de negocio principal del partido

**Responsabilidades**:
- ✅ Gestionar estado del partido (equipos, marcador, tiempo)
- ✅ Control del cronómetro (iniciar, pausar, reiniciar)
- ✅ Añadir goles y tiempo extra
- ✅ Integrar con HealthKitManager
- ✅ Persistir historial en UserDefaults
- ✅ Formatear datos para presentación

**Propiedades @Published**:
```swift
@Published var team1Name: String
@Published var team1Score: Int
@Published var elapsedTime: TimeInterval
@Published var isMatchActive: Bool
@Published var matchHistory: [Match]
```

**Usado por**: iOS (principal), Watch recibe actualizaciones

---

#### `HealthKitManager.swift`
**Propósito**: Interfaz con HealthKit para datos de salud

**Responsabilidades**:
- ✅ Solicitar permisos de HealthKit
- ✅ Monitorear frecuencia cardíaca en tiempo real
- ✅ Calcular calorías quemadas
- ✅ Obtener promedios de BPM al finalizar

**API Principal**:
```swift
func requestAuthorization(completion: @escaping (Bool) -> Void)
func startHeartRateMonitoring()
func startCaloriesTracking()
func stopTracking(completion: @escaping (Double?, Double?) -> Void)
```

**Propiedades @Published**:
```swift
@Published var currentHeartRate: Double
@Published var caloriesBurned: Double
@Published var isAuthorized: Bool
```

**Usado por**: iOS y Watch

---

#### `WatchConnectivityManager.swift`
**Propósito**: Sincronización bidireccional iPhone ↔ Watch

**Responsabilidades**:
- ✅ Establecer sesión de WatchConnectivity
- ✅ Enviar estado del partido desde iPhone
- ✅ Recibir eventos de goles desde Watch
- ✅ Gestionar cambios de estado de conexión

**Mensajes iPhone → Watch**:
```swift
"matchState": {
    team1Name, team2Name,
    team1Score, team2Score,
    elapsedTime, isRunning
}
"heartRate": { value }
```

**Mensajes Watch → iPhone**:
```swift
"goalTeam1"
"goalTeam2"
"toggleTimer"
```

**Usado por**: iOS y Watch (con extensión específica)

---

### **iOS/** (Aplicación iPhone)

#### `FutbolProApp.swift`
**Propósito**: Entry point de la app iOS

**Responsabilidades**:
- ✅ Inicializar ViewModels como @StateObject
- ✅ Configurar EnvironmentObjects
- ✅ Solicitar permisos de HealthKit al inicio
- ✅ Activar WatchConnectivity

```swift
@StateObject private var healthKitManager = HealthKitManager()
@StateObject private var viewModel: MatchViewModel
```

---

#### `ContentView.swift`
**Propósito**: Coordinador de navegación principal

**Responsabilidades**:
- ✅ Decidir qué vista mostrar (Setup vs Dashboard)
- ✅ Gestionar navegación al historial
- ✅ Proveer contexto global a sub-vistas

**Lógica de Vista**:
```swift
if viewModel.isMatchActive {
    MatchDashboardView()  // Durante partido
} else {
    MatchSetupView()      // Configuración
}
```

---

#### `MatchSetupView.swift`
**Propósito**: Pantalla de configuración inicial

**Componentes UI**:
- TextField para nombres de equipos
- Picker para selección de periodo (20/45/90 min)
- Botón "Iniciar Partido"

**Validaciones**:
- Si los nombres están vacíos, usa defaults ("Equipo 1", "Equipo 2")

---

#### `MatchDashboardView.swift`
**Propósito**: Dashboard principal durante el partido

**Componentes UI**:

1. **HealthStatsBar**: Muestra BPM y calorías en tiempo real
2. **TimerDisplay**: Cronómetro grande con tiempo restante
3. **ScoreBoard**: Marcador con botones +1 para goles
4. **ControlButtons**: Play/Pause y Reset
5. **BottomControls**: Botones de Tiempo Extra y Finalizar

**Sub-Vistas**:
- `TeamScoreView`: Panel individual de equipo
- `ExtraTimeSheet`: Modal para agregar minutos

**Sincronización Watch**:
```swift
.onReceive(NotificationCenter.default.publisher(for: .goalTeam1)) { _ in
    viewModel.addGoalTeam1()
}
```

---

#### `MatchHistoryView.swift`
**Propósito**: Historial de partidos guardados

**Componentes UI**:
- Lista con `MatchHistoryRow` por cada partido
- `EmptyHistoryView` si no hay datos
- Swipe-to-delete para eliminar partidos

**Datos Mostrados**:
- Equipos y resultado
- Duración y fecha
- Promedio de BPM y calorías (si disponible)

---

#### `Extensions.swift`
**Propósito**: Extensiones de utilidad

```swift
extension Color {
    static let neonGreen = Color(red: 0.0, green: 1.0, blue: 0.0)
}
```

Puedes agregar más colores personalizados aquí.

---

#### `Info.plist`
**Propósito**: Configuración de la app y permisos

**Claves Importantes**:
```xml
<key>NSHealthShareUsageDescription</key>
<string>Descripción para el usuario...</string>

<key>UIBackgroundModes</key>
<array>
    <string>processing</string>
</array>
```

---

### **Watch/** (Aplicación Apple Watch)

#### `WatchApp.swift`
**Propósito**: Entry point del Watch App

**Responsabilidades**:
- ✅ Inicializar ViewModels específicos del Watch
- ✅ Configurar EnvironmentObjects
- ✅ Activar WatchConnectivity

```swift
@StateObject private var viewModel = WatchMatchViewModel()
@StateObject private var healthKitManager = HealthKitManager()
```

---

#### `WatchMatchView.swift`
**Propósito**: Interfaz principal del Watch

**Estructura**:
```swift
TabView {
    TimerTabView()     // Pestaña 1: Cronómetro
    ScoreTabView()     // Pestaña 2: Marcador
    HealthTabView()    // Pestaña 3: Salud
}
.tabViewStyle(.page)
```

**Sub-Vistas**:

1. **TimerTabView**: Muestra tiempo y botones Play/Pause
2. **ScoreTabView**: Botones +1 para cada equipo
3. **HealthTabView**: BPM y calorías en tiempo real

---

#### `WatchMatchViewModel.swift`
**Propósito**: ViewModel específico del Watch

**Responsabilidades**:
- ✅ Mantener estado local del partido
- ✅ Enviar eventos de goles al iPhone
- ✅ Recibir actualizaciones del iPhone vía NotificationCenter

**Comunicación**:
```swift
// Enviar gol al iPhone
func addGoalTeam1() {
    team1Score += 1
    sendGoalNotification(team: 1)
}

// Recibir actualización del iPhone
NotificationCenter.default.addObserver(
    forName: NSNotification.Name("matchStateUpdated"),
    ...
)
```

---

#### `WatchConnectivityManager+Watch.swift`
**Propósito**: Extensión específica para manejar mensajes en Watch

**Responsabilidades**:
- ✅ Parsear mensajes "matchState" del iPhone
- ✅ Publicar notificaciones locales para actualizar UI

```swift
func handleWatchMessage(_ message: [String: Any]) {
    // Procesar mensaje y emitir NotificationCenter
}
```

---

## 🔄 Flujo de Datos

### 1. Inicio de Partido (iPhone)

```
Usuario → MatchSetupView → MatchViewModel.startMatch()
  ↓
MatchViewModel inicia:
  - Timer local
  - HealthKitManager.startHeartRateMonitoring()
  - HealthKitManager.startCaloriesTracking()
  ↓
MatchViewModel.isMatchActive = true
  ↓
ContentView muestra MatchDashboardView
```

### 2. Agregar Gol desde Watch

```
Usuario presiona +1 en Watch
  ↓
WatchMatchViewModel.addGoalTeam1()
  ↓
WatchConnectivityManager envía mensaje "goalTeam1"
  ↓
iPhone WatchConnectivityManager recibe mensaje
  ↓
NotificationCenter.default.post(name: .goalTeam1)
  ↓
MatchDashboardView recibe notificación
  ↓
MatchViewModel.addGoalTeam1() actualiza marcador
  ↓
WatchConnectivityManager envía nuevo estado al Watch
  ↓
Watch actualiza UI
```

### 3. Monitoreo de HealthKit

```
MatchViewModel.startMatch()
  ↓
HealthKitManager.startHeartRateMonitoring()
  ↓
HKAnchoredObjectQuery empieza a escuchar
  ↓
Cada nueva muestra de BPM:
  ↓
HealthKitManager.currentHeartRate actualizado (@Published)
  ↓
SwiftUI re-renderiza HealthStatsBar automáticamente
```

### 4. Finalizar Partido

```
Usuario presiona "Finalizar"
  ↓
MatchViewModel.finishMatch()
  ↓
HealthKitManager.stopTracking() calcula promedios
  ↓
MatchViewModel crea objeto Match con datos finales
  ↓
Match se agrega a matchHistory
  ↓
UserDefaults.standard.set() persiste datos
  ↓
MatchViewModel.resetMatch() limpia estado
  ↓
ContentView vuelve a MatchSetupView
```

---

## 🧪 Testing

### ViewModels
- Testear lógica de cronómetro
- Validar cálculos de tiempo restante
- Verificar persistencia de historial

### HealthKitManager
- Mock HKHealthStore para tests unitarios
- Verificar manejo de permisos
- Testear procesamiento de muestras

### WatchConnectivity
- Mock WCSession
- Verificar serialización de mensajes
- Testear manejo de errores de conexión

---

## 🔐 Seguridad y Privacidad

### HealthKit
- Datos nunca salen del dispositivo del usuario
- Solo lectura (no escritura) de datos de salud
- Permisos solicitados explícitamente

### UserDefaults
- Almacenamiento local sin encriptación
- Para datos no sensibles (resultados de partidos)
- Migrar a Keychain si se almacenan datos personales

---

## 🚀 Extensibilidad

### Para agregar nuevas estadísticas:
1. Extender modelo `Match` con nueva propiedad
2. Actualizar `HealthKitManager` para leer nuevo dato
3. Modificar `MatchHistoryRow` para mostrar dato

### Para agregar nuevas vistas:
1. Crear archivo SwiftUI en carpeta correspondiente
2. Inyectar `@EnvironmentObject` necesarios
3. Actualizar `ContentView` o navegación

### Para agregar complicaciones Watch:
1. Crear `ComplicationController.swift`
2. Implementar timeline providers
3. Configurar en Info.plist del Watch

---

## 📚 Referencias

- [HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [WatchConnectivity Framework](https://developer.apple.com/documentation/watchconnectivity)
- [SwiftUI MVVM Best Practices](https://developer.apple.com/tutorials/swiftui)

---

**Última actualización**: 2025-02-09
