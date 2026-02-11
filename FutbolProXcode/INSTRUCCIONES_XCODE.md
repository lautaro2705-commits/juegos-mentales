# Instrucciones para Crear el Proyecto FutbolPro en Xcode

Como los proyectos de Xcode son complejos de crear por línea de comandos, aquí están las instrucciones paso a paso que debes seguir **manualmente** en Xcode.

## 🎯 Paso 1: Crear Proyecto Base en Xcode

1. **Abre Xcode**
2. Selecciona **File → New → Project**
3. En la sección **iOS**, selecciona **App**
4. Click **Next**

### Configuración del Proyecto:
```
Product Name: FutbolPro
Team: (Tu cuenta de desarrollador)
Organization Identifier: com.tuempresa
Bundle Identifier: com.tuempresa.FutbolPro
Interface: SwiftUI
Language: Swift
☑️ Include Tests
```

5. Click **Next**
6. Guarda en: `/Users/macbook/mis-proyectos/FutbolProXcode/`
7. Click **Create**

---

## 🎯 Paso 2: Agregar Watch App Target

1. Con el proyecto abierto, ve a **File → New → Target**
2. Selecciona **watchOS** en la barra lateral
3. Selecciona **Watch App**
4. Click **Next**

### Configuración Watch:
```
Product Name: FutbolPro Watch App
Bundle Identifier: com.tuempresa.FutbolPro.watchkitapp
```

5. Click **Finish**
6. En el diálogo "Activate scheme?", click **Activate**

---

## 🎯 Paso 3: Configurar Capabilities

### Para iOS Target:

1. Selecciona el proyecto **FutbolPro** en el navegador
2. Selecciona el target **FutbolPro** (iOS)
3. Ve a la pestaña **Signing & Capabilities**
4. Click en **+ Capability**
5. Busca y agrega **HealthKit**
6. Click en **+ Capability** otra vez
7. Busca y agrega **Background Modes**
8. Marca la casilla **Background fetch**

### Para Watch Target:

1. Selecciona el target **FutbolPro Watch App**
2. Ve a la pestaña **Signing & Capabilities**
3. Click en **+ Capability**
4. Busca y agrega **HealthKit**

---

## 🎯 Paso 4: Copiar Archivos del Código

### A) Archivos Shared (iOS + Watch)

1. En Xcode, crea un nuevo grupo: Click derecho en FutbolPro → **New Group** → Nombre: `Shared`

2. Arrastra o copia estos archivos a la carpeta **Shared**:
   - `/Users/macbook/mis-proyectos/FutbolPro/Shared/Match.swift`
   - `/Users/macbook/mis-proyectos/FutbolPro/Shared/MatchViewModel.swift`
   - `/Users/macbook/mis-proyectos/FutbolPro/Shared/HealthKitManager.swift`
   - `/Users/macbook/mis-proyectos/FutbolPro/Shared/WatchConnectivityManager.swift`

3. **IMPORTANTE**: Para cada archivo, en el **File Inspector** (panel derecho), verifica que **Target Membership** tenga marcados:
   - ✅ FutbolPro (iOS)
   - ✅ FutbolPro Watch App

### B) Archivos iOS

1. Reemplaza o agrega estos archivos en el grupo **FutbolPro** (iOS):
   - Reemplaza `FutbolProApp.swift` con `/Users/macbook/mis-proyectos/FutbolPro/iOS/FutbolProApp.swift`
   - Reemplaza `ContentView.swift` con `/Users/macbook/mis-proyectos/FutbolPro/iOS/ContentView.swift`
   - Agrega `MatchSetupView.swift` desde `/Users/macbook/mis-proyectos/FutbolPro/iOS/MatchSetupView.swift`
   - Agrega `MatchDashboardView.swift` desde `/Users/macbook/mis-proyectos/FutbolPro/iOS/MatchDashboardView.swift`
   - Agrega `MatchHistoryView.swift` desde `/Users/macbook/mis-proyectos/FutbolPro/iOS/MatchHistoryView.swift`
   - Agrega `Extensions.swift` desde `/Users/macbook/mis-proyectos/FutbolPro/iOS/Extensions.swift`

2. **IMPORTANTE**: Verifica que estos archivos solo tengan marcado:
   - ✅ FutbolPro (iOS)
   - ❌ FutbolPro Watch App (desmarcado)

### C) Archivos Watch

1. En el grupo **FutbolPro Watch App**, reemplaza/agrega:
   - Reemplaza el archivo principal con `/Users/macbook/mis-proyectos/FutbolPro/Watch/WatchApp.swift`
   - Agrega `WatchMatchView.swift` desde `/Users/macbook/mis-proyectos/FutbolPro/Watch/WatchMatchView.swift`
   - Agrega `WatchMatchViewModel.swift` desde `/Users/macbook/mis-proyectos/FutbolPro/Watch/WatchMatchViewModel.swift`
   - Agrega `WatchConnectivityManager+Watch.swift` desde `/Users/macbook/mis-proyectos/FutbolPro/Watch/WatchConnectivityManager+Watch.swift`

2. **IMPORTANTE**: Verifica que estos archivos solo tengan marcado:
   - ❌ FutbolPro (iOS) (desmarcado)
   - ✅ FutbolPro Watch App

---

## 🎯 Paso 5: Configurar Info.plist (iOS)

1. En el navegador de archivos, busca `Info.plist` del target iOS
2. Click derecho → **Open As → Source Code**
3. Agrega estas claves antes de `</dict>`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>FutbolPro necesita acceso a tu frecuencia cardíaca y calorías para monitorear tu rendimiento durante los partidos.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>FutbolPro necesita permiso para registrar tus datos de actividad durante los partidos.</string>
<key>UIBackgroundModes</key>
<array>
    <string>processing</string>
</array>
```

---

## 🎯 Paso 6: Configurar Info.plist (Watch)

1. Busca `Info.plist` del target Watch
2. Click derecho → **Open As → Source Code**
3. Agrega estas claves antes de `</dict>`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>FutbolPro necesita acceso a tu frecuencia cardíaca y calorías para monitorear tu rendimiento durante los partidos.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>FutbolPro necesita permiso para registrar tus datos de actividad durante los partidos.</string>
```

---

## 🎯 Paso 7: Configurar Entitlements

### iOS Entitlements:

1. Selecciona el target **FutbolPro** (iOS)
2. Ve a **Build Settings**
3. Busca "Code Signing Entitlements"
4. Agrega el valor: `FutbolPro/FutbolPro.entitlements`

5. Crea el archivo:
   - File → New → File
   - Selecciona **Property List**
   - Nombre: `FutbolPro.entitlements`
   - Target: FutbolPro (iOS)
   - Click derecho → Open As → Source Code
   - Reemplaza el contenido con:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
</dict>
</plist>
```

### Watch Entitlements:

Repite el proceso para el target Watch con nombre `FutbolPro Watch App.entitlements`

---

## 🎯 Paso 8: Compilar y Ejecutar

1. **Limpiar el proyecto**: Product → Clean Build Folder (⇧⌘K)

2. **Compilar iOS**:
   - Selecciona esquema **FutbolPro**
   - Selecciona simulador **iPhone 15 Pro**
   - Click en **Run** (⌘R)

3. **Compilar Watch**:
   - Selecciona esquema **FutbolPro Watch App**
   - Selecciona simulador **Apple Watch Series 9 (45mm)**
   - Click en **Run** (⌘R)

---

## ✅ Verificación Final

Si todo está correcto:
- ✅ La app iOS debe compilar sin errores
- ✅ La app Watch debe compilar sin errores
- ✅ La app iOS debe mostrar la pantalla de configuración
- ✅ La app Watch debe mostrar 3 pestañas (Timer, Score, Health)

---

## 🚨 Solución de Problemas Comunes

### Error: "Cannot find 'neonGreen' in scope"
**Solución**: Verifica que `Extensions.swift` esté en el target iOS

### Error: "No such module 'WatchConnectivity'"
**Solución**: Verifica que todos los archivos Shared tengan ambos targets marcados

### Error: "HealthKit entitlement is missing"
**Solución**: Verifica que los entitlements estén configurados en Build Settings

### Watch no sincroniza
**Nota**: La sincronización real solo funciona en dispositivos físicos, no en simulador

---

## 🎉 ¡Listo!

Una vez completados estos pasos, tendrás FutbolPro funcionando completamente en iOS y Apple Watch.

Para probar todas las funcionalidades de HealthKit, necesitarás dispositivos físicos (iPhone y Apple Watch reales).
