#!/bin/bash

# Script para preparar el proyecto FutbolPro
# Autor: Asistente Claude
# Fecha: 2025-02-09

echo "════════════════════════════════════════════════════════════"
echo "  Preparando Proyecto FutbolPro para Xcode"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directorios
BASE_DIR="/Users/macbook/mis-proyectos"
SOURCE_DIR="$BASE_DIR/FutbolPro"
TARGET_DIR="$BASE_DIR/FutbolProXcode"

echo -e "${BLUE}📂 Verificando directorios...${NC}"

if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${YELLOW}⚠️  Directorio fuente no encontrado: $SOURCE_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Directorio fuente encontrado${NC}"

# Crear estructura de directorios
echo ""
echo -e "${BLUE}📁 Creando estructura de directorios...${NC}"

mkdir -p "$TARGET_DIR/FutbolPro"
mkdir -p "$TARGET_DIR/FutbolPro/Shared"
mkdir -p "$TARGET_DIR/FutbolPro/iOS"
mkdir -p "$TARGET_DIR/FutbolPro/Watch"
mkdir -p "$TARGET_DIR/FutbolPro/Resources"

echo -e "${GREEN}✅ Estructura creada${NC}"

# Copiar archivos Shared
echo ""
echo -e "${BLUE}📋 Copiando archivos Shared (iOS + Watch)...${NC}"

cp "$SOURCE_DIR/Shared/Match.swift" "$TARGET_DIR/FutbolPro/Shared/"
cp "$SOURCE_DIR/Shared/MatchViewModel.swift" "$TARGET_DIR/FutbolPro/Shared/"
cp "$SOURCE_DIR/Shared/HealthKitManager.swift" "$TARGET_DIR/FutbolPro/Shared/"
cp "$SOURCE_DIR/Shared/WatchConnectivityManager.swift" "$TARGET_DIR/FutbolPro/Shared/"

echo -e "${GREEN}✅ Archivos Shared copiados (4 archivos)${NC}"

# Copiar archivos iOS
echo ""
echo -e "${BLUE}📱 Copiando archivos iOS...${NC}"

cp "$SOURCE_DIR/iOS/FutbolProApp.swift" "$TARGET_DIR/FutbolPro/iOS/"
cp "$SOURCE_DIR/iOS/ContentView.swift" "$TARGET_DIR/FutbolPro/iOS/"
cp "$SOURCE_DIR/iOS/MatchSetupView.swift" "$TARGET_DIR/FutbolPro/iOS/"
cp "$SOURCE_DIR/iOS/MatchDashboardView.swift" "$TARGET_DIR/FutbolPro/iOS/"
cp "$SOURCE_DIR/iOS/MatchHistoryView.swift" "$TARGET_DIR/FutbolPro/iOS/"
cp "$SOURCE_DIR/iOS/Extensions.swift" "$TARGET_DIR/FutbolPro/iOS/"
cp "$SOURCE_DIR/iOS/Info.plist" "$TARGET_DIR/FutbolPro/iOS/"

echo -e "${GREEN}✅ Archivos iOS copiados (7 archivos)${NC}"

# Copiar archivos Watch
echo ""
echo -e "${BLUE}⌚ Copiando archivos Watch...${NC}"

cp "$SOURCE_DIR/Watch/WatchApp.swift" "$TARGET_DIR/FutbolPro/Watch/"
cp "$SOURCE_DIR/Watch/WatchMatchView.swift" "$TARGET_DIR/FutbolPro/Watch/"
cp "$SOURCE_DIR/Watch/WatchMatchViewModel.swift" "$TARGET_DIR/FutbolPro/Watch/"
cp "$SOURCE_DIR/Watch/WatchConnectivityManager+Watch.swift" "$TARGET_DIR/FutbolPro/Watch/"
cp "$SOURCE_DIR/Watch/Info.plist" "$TARGET_DIR/FutbolPro/Watch/"

echo -e "${GREEN}✅ Archivos Watch copiados (5 archivos)${NC}"

# Copiar configuración
echo ""
echo -e "${BLUE}⚙️  Copiando archivos de configuración...${NC}"

cp "$SOURCE_DIR/FutbolPro.entitlements" "$TARGET_DIR/FutbolPro/"

echo -e "${GREEN}✅ Configuración copiada${NC}"

# Copiar documentación
echo ""
echo -e "${BLUE}📚 Copiando documentación...${NC}"

cp "$SOURCE_DIR/README.md" "$TARGET_DIR/"
cp "$SOURCE_DIR/QUICKSTART.md" "$TARGET_DIR/"
cp "$SOURCE_DIR/ARCHITECTURE.md" "$TARGET_DIR/"
cp "$SOURCE_DIR/PROJECT_SUMMARY.md" "$TARGET_DIR/"
cp "$SOURCE_DIR/FILE_INDEX.md" "$TARGET_DIR/"
cp "$SOURCE_DIR/LEEME_PRIMERO.txt" "$TARGET_DIR/"

echo -e "${GREEN}✅ Documentación copiada (6 archivos)${NC}"

# Crear archivo de resumen
echo ""
echo -e "${BLUE}📝 Creando archivo de resumen...${NC}"

cat > "$TARGET_DIR/ESTRUCTURA.txt" << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║          ESTRUCTURA DEL PROYECTO FUTBOLPRO                       ║
╚══════════════════════════════════════════════════════════════════╝

FutbolProXcode/
│
├── INSTRUCCIONES_XCODE.md    ← LEE ESTO PRIMERO
├── LEEME_PRIMERO.txt
├── README.md
├── QUICKSTART.md
├── ARCHITECTURE.md
├── PROJECT_SUMMARY.md
├── FILE_INDEX.md
│
└── FutbolPro/
    ├── Shared/                (iOS + Watch targets)
    │   ├── Match.swift
    │   ├── MatchViewModel.swift
    │   ├── HealthKitManager.swift
    │   └── WatchConnectivityManager.swift
    │
    ├── iOS/                   (Solo iOS target)
    │   ├── FutbolProApp.swift
    │   ├── ContentView.swift
    │   ├── MatchSetupView.swift
    │   ├── MatchDashboardView.swift
    │   ├── MatchHistoryView.swift
    │   ├── Extensions.swift
    │   └── Info.plist
    │
    ├── Watch/                 (Solo Watch target)
    │   ├── WatchApp.swift
    │   ├── WatchMatchView.swift
    │   ├── WatchMatchViewModel.swift
    │   ├── WatchConnectivityManager+Watch.swift
    │   └── Info.plist
    │
    └── FutbolPro.entitlements

════════════════════════════════════════════════════════════════════

PRÓXIMOS PASOS:

1. Abre Xcode
2. Crea un nuevo proyecto iOS App con nombre "FutbolPro"
3. Agrega Watch App target
4. Sigue las instrucciones en INSTRUCCIONES_XCODE.md
5. Copia los archivos de este directorio al proyecto Xcode

════════════════════════════════════════════════════════════════════
EOF

echo -e "${GREEN}✅ Archivo de resumen creado${NC}"

# Verificar archivos copiados
echo ""
echo -e "${BLUE}🔍 Verificando archivos copiados...${NC}"

SHARED_COUNT=$(ls -1 "$TARGET_DIR/FutbolPro/Shared" | wc -l)
IOS_COUNT=$(ls -1 "$TARGET_DIR/FutbolPro/iOS" | wc -l)
WATCH_COUNT=$(ls -1 "$TARGET_DIR/FutbolPro/Watch" | wc -l)

echo -e "  Shared: ${GREEN}$SHARED_COUNT archivos${NC}"
echo -e "  iOS: ${GREEN}$IOS_COUNT archivos${NC}"
echo -e "  Watch: ${GREEN}$WATCH_COUNT archivos${NC}"

# Resumen final
echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ¡PROYECTO PREPARADO CON ÉXITO!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📍 Ubicación: $TARGET_DIR"
echo ""
echo "📖 Próximos pasos:"
echo "   1. cd $TARGET_DIR"
echo "   2. cat INSTRUCCIONES_XCODE.md"
echo "   3. Seguir las instrucciones paso a paso"
echo ""
echo "🚀 ¡Todo listo para Xcode!"
echo ""
