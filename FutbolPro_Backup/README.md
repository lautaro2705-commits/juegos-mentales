# FutbolPro ⚽️

Una aplicación completa de gestión de partidos de fútbol para iOS y Apple Watch con integración de HealthKit.

## Características

### iPhone App
- ✅ Configuración de partidos con nombres de equipos personalizados
- ✅ Tablero de control con marcador en tiempo real
- ✅ Cronómetro de alta precisión con control de periodos
- ✅ Monitoreo de frecuencia cardíaca y calorías en tiempo real
- ✅ Historial de partidos guardados con estadísticas
- ✅ Diseño Dark Mode con colores neon green

### Apple Watch App
- ✅ Control de marcador desde el reloj
- ✅ Sincronización en tiempo real con iPhone
- ✅ Visualización de estadísticas de salud
- ✅ Control de cronómetro

### Integración HealthKit
- ✅ Lectura de frecuencia cardíaca en tiempo real (BPM)
- ✅ Seguimiento de calorías quemadas
- ✅ Promedio de frecuencia cardíaca por partido
- ✅ Almacenamiento de datos de salud en historial

## Estructura del Proyecto

```
FutbolPro/
├── Shared/                          # Código compartido entre iOS y Watch
│   ├── Match.swift                  # Modelos de datos
│   ├── MatchViewModel.swift         # Lógica de negocio
│   ├── HealthKitManager.swift       # Integración HealthKit
│   └── WatchConnectivityManager.swift  # Comunicación iPhone-Watch
│
├── iOS/                             # Aplicación iPhone
│   ├── FutbolProApp.swift          # Entry point
│   ├── ContentView.swift            # Coordinador principal
│   ├── MatchSetupView.swift         # Configuración inicial
│   ├── MatchDashboardView.swift     # Dashboard del partido
│   ├── MatchHistoryView.swift       # Historial de partidos
│   ├── Extensions.swift             # Extensiones de Color
│   └── Info.plist                   # Configuración y permisos
│
└── Watch/                           # Aplicación Apple Watch
    ├── WatchApp.swift               # Entry point Watch
    ├── WatchMatchView.swift         # Interfaz principal Watch
    ├── WatchMatchViewModel.swift    # ViewModel Watch
    └── WatchConnectivityManager+Watch.swift  # Extensión Watch
```

## Configuración del Proyecto en Xcode

### Paso 1: Crear el Proyecto

1. Abre Xcode y crea un nuevo proyecto:
   - **iOS App** con **SwiftUI**
   - Nombre: `FutbolPro`
   - Organization Identifier: `com.tuempresa`
   - Include Tests: ✓

2. Agrega un **Watch App Target**:
   - File → New → Target
   - Selecciona **Watch App**
   - Nombre: `FutbolPro Watch App`

### Paso 2: Configurar Capabilities

#### Para el Target iOS:
1. Selecciona el target `FutbolPro` (iOS)
2. Ve a **Signing & Capabilities**
3. Haz clic en **+ Capability** y agrega:
   - **HealthKit**
   - **Background Modes** (marca "Background fetch")

#### Para el Target Watch:
1. Selecciona el target `FutbolPro Watch App`
2. Ve a **Signing & Capabilities**
3. Haz clic en **+ Capability** y agrega:
   - **HealthKit**

### Paso 3: Organizar los Archivos

1. **Crear Grupo "Shared"**:
   - Clic derecho en el proyecto → New Group → "Shared"
   - Arrastra los archivos compartidos:
     - `Match.swift`
     - `MatchViewModel.swift`
     - `HealthKitManager.swift`
     - `WatchConnectivityManager.swift`
   - En el File Inspector (panel derecho), marca **Target Membership** para:
     - ✓ FutbolPro (iOS)
     - ✓ FutbolPro Watch App

2. **Archivos iOS**:
   - Coloca todos los archivos de la carpeta `iOS/` en el grupo iOS
   - Asegúrate que solo tengan marcado el target iOS

3. **Archivos Watch**:
   - Coloca todos los archivos de la carpeta `Watch/` en el grupo Watch
   - Asegúrate que solo tengan marcado el target Watch

### Paso 4: Configurar Info.plist

El archivo `Info.plist` ya incluye las descripciones necesarias para HealthKit:

```xml
<key>NSHealthShareUsageDescription</key>
<string>FutbolPro necesita acceso a tu frecuencia cardíaca y calorías para monitorear tu rendimiento durante los partidos.</string>
```

### Paso 5: Configurar el Entitlement de HealthKit

1. Para el target **iOS**:
   - Crea archivo: File → New → File → Property List
   - Nombre: `FutbolPro.entitlements`
   - Agrega:
     ```xml
     <key>com.apple.developer.healthkit</key>
     <true/>
     <key>com.apple.developer.healthkit.access</key>
     <array/>
     ```

2. Para el target **Watch**:
   - Crea archivo: `FutbolPro Watch App.entitlements`
   - Agrega el mismo contenido

### Paso 6: Build Settings

1. Asegúrate que el **Minimum Deployment Target** sea:
   - iOS: 16.0 o superior
   - watchOS: 9.0 o superior

2. Verifica que **Swift Language Version** sea Swift 5.0

## Compilación y Ejecución

### En Simulador:

```bash
# Para iPhone
Selecciona esquema "FutbolPro" → iPhone Simulator → Run (⌘R)

# Para Watch
Selecciona esquema "FutbolPro Watch App" → Apple Watch Simulator → Run (⌘R)
```

### En Dispositivo Real:

1. Conecta tu iPhone
2. En **Signing & Capabilities**, selecciona tu Team
3. Acepta los permisos de HealthKit en el dispositivo
4. Para el Watch:
   - Asegúrate que el Watch esté emparejado
   - El Watch App se instalará automáticamente

## Uso de la Aplicación

### Configurar un Partido

1. Abre la app en iPhone
2. Ingresa los nombres de los equipos (opcional)
3. Selecciona la duración del partido (20, 45 o 90 minutos)
4. Presiona **"Iniciar Partido"**

### Durante el Partido

**En iPhone:**
- Los botones **+1** suman goles a cada equipo
- **Play/Pause** controla el cronómetro
- **Tiempo Extra** agrega minutos adicionales
- **Finalizar** guarda el partido en el historial

**En Apple Watch:**
- Desliza entre 3 pestañas:
  1. **Timer**: Control del cronómetro
  2. **Score**: Botones para agregar goles
  3. **Health**: Frecuencia cardíaca y calorías

### Ver Historial

1. Presiona el ícono del reloj (⏱) en la barra superior
2. Revisa partidos anteriores con:
   - Resultado final
   - Duración del partido
   - Promedio de frecuencia cardíaca
   - Calorías quemadas
3. Desliza para eliminar partidos

## Permisos Requeridos

La app solicitará permisos para:
- ✅ Leer frecuencia cardíaca
- ✅ Leer calorías activas
- ✅ WatchConnectivity (automático)

## Tecnologías Utilizadas

- **Swift 5.9+**
- **SwiftUI**
- **HealthKit**
- **WatchConnectivity**
- **Combine**
- **UserDefaults** para persistencia

## Solución de Problemas

### HealthKit no funciona:
- Verifica que el dispositivo tenga HealthKit habilitado
- Comprueba que los permisos estén aceptados en Configuración → Privacidad → Salud
- HealthKit NO funciona en Simulador (necesitas dispositivo real)

### Watch no sincroniza:
- Asegúrate que el Watch esté desbloqueado
- Verifica que ambas apps estén abiertas
- Reinicia WatchConnectivity cerrando y abriendo las apps

### Build Errors:
- Limpia el proyecto: Product → Clean Build Folder (⇧⌘K)
- Verifica que todos los Target Memberships estén correctos
- Asegúrate que los entitlements estén configurados

## Mejoras Futuras

- [ ] Exportar partidos en CSV
- [ ] Gráficas de rendimiento
- [ ] Notificaciones en el Watch
- [ ] Soporte para más de 2 equipos
- [ ] Integración con CloudKit
- [ ] Complicaciones para Watch Face

## Licencia

Proyecto de ejemplo para desarrollo educativo.

## Autor

Desarrollado con Swift/SwiftUI para iOS y watchOS.

---

**Nota**: Este proyecto requiere un dispositivo físico con HealthKit para probar completamente todas las funcionalidades de monitoreo de salud.
