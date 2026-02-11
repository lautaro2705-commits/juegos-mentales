#!/bin/bash
# =====================================================================
# TIJUCA TRAVEL - SCRIPT DE INSTALACIÓN AUTOMÁTICA
# =====================================================================

set -e  # Salir si hay error

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         🚀 TIJUCA TRAVEL - INSTALACIÓN AUTOMÁTICA                ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# =====================================================================
# PASO 1: VERIFICAR DEPENDENCIAS
# =====================================================================

echo "📋 Paso 1: Verificando dependencias..."

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python $(python3 --version)${NC}"

# Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL no está instalado${NC}"
    echo "   Instalar con: brew install postgresql@15"
    exit 1
fi
echo -e "${GREEN}✅ PostgreSQL instalado${NC}"

# Verificar Redis
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}⚠️  Redis no está instalado${NC}"
    echo "   Instalar con: brew install redis"
    exit 1
fi
echo -e "${GREEN}✅ Redis instalado${NC}"

echo ""

# =====================================================================
# PASO 2: CREAR ENTORNO VIRTUAL
# =====================================================================

echo "🐍 Paso 2: Creando entorno virtual de Python..."

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo -e "${GREEN}✅ Entorno virtual creado${NC}"
else
    echo -e "${YELLOW}⚠️  Entorno virtual ya existe (omitiendo)${NC}"
fi

# Activar entorno virtual
source venv/bin/activate
echo -e "${GREEN}✅ Entorno virtual activado${NC}"

echo ""

# =====================================================================
# PASO 3: INSTALAR DEPENDENCIAS
# =====================================================================

echo "📦 Paso 3: Instalando dependencias de Python..."

pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1

echo -e "${GREEN}✅ Dependencias instaladas${NC}"

echo ""

# =====================================================================
# PASO 4: CONFIGURAR .ENV
# =====================================================================

echo "⚙️  Paso 4: Configurando variables de entorno..."

if [ ! -f ".env" ]; then
    cp .env.example .env

    # Generar JWT secret aleatorio
    JWT_SECRET=$(openssl rand -base64 32)

    # Reemplazar en .env (macOS)
    sed -i '' "s|JWT_SECRET_KEY=CAMBIAR_ESTO_EN_PRODUCCION_USAR_32_CARACTERES_MINIMO|JWT_SECRET_KEY=${JWT_SECRET}|g" .env

    echo -e "${GREEN}✅ Archivo .env creado${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANTE: Edita .env y configura:${NC}"
    echo "   - DATABASE_URL (password de PostgreSQL)"
    echo "   - ANTHROPIC_API_KEY (para HunterBot)"
else
    echo -e "${YELLOW}⚠️  Archivo .env ya existe (omitiendo)${NC}"
fi

echo ""

# =====================================================================
# PASO 5: CREAR BASE DE DATOS
# =====================================================================

echo "🗄️  Paso 5: Configurando base de datos..."

# Verificar si la base de datos existe
if psql -lqt | cut -d \| -f 1 | grep -qw tijuca_travel_db; then
    echo -e "${YELLOW}⚠️  Base de datos 'tijuca_travel_db' ya existe${NC}"
    read -p "   ¿Quieres recrearla? (S/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        dropdb tijuca_travel_db
        createdb tijuca_travel_db
        echo -e "${GREEN}✅ Base de datos recreada${NC}"
    else
        echo -e "${YELLOW}⚠️  Usando base de datos existente${NC}"
    fi
else
    createdb tijuca_travel_db
    echo -e "${GREEN}✅ Base de datos 'tijuca_travel_db' creada${NC}"
fi

# Ejecutar scripts SQL
echo "   Ejecutando scripts SQL..."
psql -d tijuca_travel_db -f database/01_database_rls.sql > /dev/null 2>&1
psql -d tijuca_travel_db -f database/03_audit_log_table.sql > /dev/null 2>&1

echo -e "${GREEN}✅ Tablas creadas (RLS habilitado)${NC}"

echo ""

# =====================================================================
# PASO 6: VERIFICAR REDIS
# =====================================================================

echo "🔴 Paso 6: Verificando Redis..."

if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis está corriendo${NC}"
else
    echo -e "${YELLOW}⚠️  Redis no está corriendo${NC}"
    echo "   Iniciar con: brew services start redis"
    echo "   O: redis-server &"
fi

echo ""

# =====================================================================
# PASO 7: TESTS BÁSICOS
# =====================================================================

echo "🧪 Paso 7: Ejecutando tests básicos..."

# Test de importaciones
python3 -c "from main import app; print('✅ Imports OK')"

echo -e "${GREEN}✅ Tests básicos pasados${NC}"

echo ""

# =====================================================================
# RESUMEN
# =====================================================================

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                     ✅ INSTALACIÓN COMPLETADA                      ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}🎉 ¡Tijuca Travel está listo!${NC}"
echo ""
echo "📝 PRÓXIMOS PASOS:"
echo ""
echo "   1. Editar .env si es necesario:"
echo "      nano .env"
echo ""
echo "   2. Iniciar la aplicación:"
echo "      source venv/bin/activate"
echo "      uvicorn main:app --reload --port 8000"
echo ""
echo "   3. Abrir en el navegador:"
echo "      http://localhost:8000/health"
echo "      http://localhost:8000/api/docs (Swagger)"
echo ""
echo "   4. Probar con curl:"
echo "      curl http://localhost:8000/health"
echo ""
echo "📚 Documentación completa: README.md"
echo ""
echo "🆘 ¿Problemas? Lee el README.md sección 'Problemas Comunes'"
echo ""
