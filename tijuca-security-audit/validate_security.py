#!/usr/bin/env python3
"""
=====================================================================
TIJUCA TRAVEL - SECURITY VALIDATION SCRIPT
=====================================================================
Propósito: Validar automáticamente que todas las capas de seguridad
           están correctamente configuradas
Autor: Senior DevSecOps Team
Fecha: 2026-02-09
Versión: 1.0

Uso:
    python validate_security.py
=====================================================================
"""

import os
import sys
import psycopg2
import redis
import json
import requests
from typing import Dict, List, Tuple
from datetime import datetime
import bcrypt


# =====================================================================
# CONFIGURACIÓN
# =====================================================================

class Config:
    """Configuración del script de validación"""

    # Database (usar postgres user para tests de RLS)
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "tijuca_db")
    DB_SUPERUSER = os.getenv("DB_SUPERUSER", "postgres")
    DB_SUPERUSER_PASSWORD = os.getenv("DB_SUPERUSER_PASSWORD", "")
    DB_APP_USER = os.getenv("DB_APP_USER", "tijuca_app")
    DB_APP_PASSWORD = os.getenv("DB_APP_PASSWORD", "CHANGE_THIS_IN_PRODUCTION_USING_ENV_VAR")

    # Redis
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

    # API
    API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

    # Test data (UUIDs de prueba del script SQL)
    TENANT_A_ID = "550e8400-e29b-41d4-a716-446655440000"
    TENANT_B_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
    TENANT_A_API_KEY = "test_api_key_sol"
    TENANT_B_API_KEY = "test_api_key_global"


# =====================================================================
# UTILIDADES
# =====================================================================

class Colors:
    """ANSI colors para output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    """Imprime header de sección"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^70}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 70}{Colors.RESET}\n")


def print_test(test_name: str, passed: bool, details: str = ""):
    """Imprime resultado de test"""
    status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if passed else f"{Colors.RED}✗ FAIL{Colors.RESET}"
    print(f"  [{status}] {test_name}")
    if details:
        print(f"         {Colors.YELLOW}{details}{Colors.RESET}")


def print_summary(results: Dict[str, List[Tuple[str, bool, str]]]):
    """Imprime resumen final"""
    print_header("RESUMEN DE VALIDACIÓN")

    total_tests = 0
    passed_tests = 0

    for suite_name, tests in results.items():
        suite_passed = sum(1 for _, passed, _ in tests if passed)
        suite_total = len(tests)
        total_tests += suite_total
        passed_tests += suite_passed

        pct = (suite_passed / suite_total * 100) if suite_total > 0 else 0
        color = Colors.GREEN if pct == 100 else Colors.YELLOW if pct >= 80 else Colors.RED

        print(f"\n{Colors.BOLD}{suite_name}{Colors.RESET}")
        print(f"  {color}{suite_passed}/{suite_total} tests passed ({pct:.1f}%){Colors.RESET}")

    print("\n" + "=" * 70)
    overall_pct = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    overall_color = Colors.GREEN if overall_pct == 100 else Colors.YELLOW if overall_pct >= 80 else Colors.RED

    print(f"{Colors.BOLD}TOTAL: {overall_color}{passed_tests}/{total_tests} tests passed ({overall_pct:.1f}%){Colors.RESET}")

    if overall_pct == 100:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 ¡TODAS LAS VALIDACIONES PASARON! Sistema listo para testing.{Colors.RESET}")
    elif overall_pct >= 80:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  Algunas validaciones fallaron. Revisar antes de producción.{Colors.RESET}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}🚨 CRÍTICO: Múltiples validaciones fallaron. NO DESPLEGAR.{Colors.RESET}")

    return overall_pct >= 80


# =====================================================================
# SUITE 1: DATABASE VALIDATION
# =====================================================================

def validate_database() -> List[Tuple[str, bool, str]]:
    """Valida configuración de base de datos"""
    print_header("SUITE 1: DATABASE SECURITY")
    results = []

    try:
        # Conectar como app user (NO superuser)
        conn = psycopg2.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            dbname=Config.DB_NAME,
            user=Config.DB_APP_USER,
            password=Config.DB_APP_PASSWORD
        )
        cursor = conn.cursor()

        # Test 1.1: Verificar que RLS está habilitado
        cursor.execute("""
            SELECT tablename, rowsecurity
            FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename IN ('ventas', 'agencias', 'security_logs')
        """)
        rls_tables = cursor.fetchall()

        rls_enabled = all(row[1] for row in rls_tables)
        results.append((
            "RLS habilitado en todas las tablas críticas",
            rls_enabled and len(rls_tables) == 3,
            f"Encontradas: {len(rls_tables)}/3 tablas con RLS={'ON' if rls_enabled else 'OFF'}"
        ))

        # Test 1.2: Verificar que IDs son UUIDs
        cursor.execute("SELECT id FROM ventas LIMIT 1")
        venta_id = cursor.fetchone()
        if venta_id:
            is_uuid = len(str(venta_id[0])) == 36 and '-' in str(venta_id[0])
            results.append((
                "IDs son UUIDs (no secuenciales)",
                is_uuid,
                f"Ejemplo: {venta_id[0]}"
            ))
        else:
            results.append(("IDs son UUIDs (no secuenciales)", False, "No hay datos de prueba"))

        # Test 1.3: Verificar que app user NO es superuser
        cursor.execute("SELECT usesuper FROM pg_user WHERE usename = current_user")
        is_superuser = cursor.fetchone()[0]
        results.append((
            "App user NO es superuser",
            not is_superuser,
            f"current_user={Config.DB_APP_USER}, superuser={is_superuser}"
        ))

        # Test 1.4: Verificar aislamiento de tenants (con RLS)
        cursor.execute(f"SET LOCAL app.current_tenant_id = '{Config.TENANT_A_ID}'")
        cursor.execute("SELECT COUNT(*) FROM ventas")
        count_a = cursor.fetchone()[0]

        cursor.execute(f"SET LOCAL app.current_tenant_id = '{Config.TENANT_B_ID}'")
        cursor.execute("SELECT COUNT(*) FROM ventas")
        count_b = cursor.fetchone()[0]

        # Los counts deben ser diferentes (asumiendo datos de prueba)
        isolation_works = count_a != count_b or (count_a == 0 and count_b == 0)
        results.append((
            "Aislamiento de tenants funciona (RLS)",
            isolation_works,
            f"Tenant A: {count_a} ventas, Tenant B: {count_b} ventas"
        ))

        # Test 1.5: Verificar que security_logs es inmutable
        try:
            cursor.execute("DELETE FROM security_logs WHERE false")  # No borra nada
            results.append((
                "security_logs tiene trigger de inmutabilidad",
                False,
                "DELETE no bloqueado (trigger faltante)"
            ))
        except psycopg2.Error as e:
            if "INMUTABLES" in str(e):
                results.append((
                    "security_logs tiene trigger de inmutabilidad",
                    True,
                    "DELETE correctamente bloqueado"
                ))
            else:
                results.append((
                    "security_logs tiene trigger de inmutabilidad",
                    False,
                    f"Error inesperado: {e}"
                ))

        # Test 1.6: Verificar que función insert_security_log existe
        cursor.execute("""
            SELECT EXISTS (
                SELECT 1 FROM pg_proc
                WHERE proname = 'insert_security_log'
            )
        """)
        fn_exists = cursor.fetchone()[0]
        results.append((
            "Función insert_security_log existe",
            fn_exists,
            "" if fn_exists else "Ejecutar 03_audit_log_table.sql"
        ))

        cursor.close()
        conn.close()

    except Exception as e:
        results.append(("Conexión a base de datos", False, f"Error: {e}"))

    # Imprimir resultados
    for test_name, passed, details in results:
        print_test(test_name, passed, details)

    return results


# =====================================================================
# SUITE 2: REDIS VALIDATION
# =====================================================================

def validate_redis() -> List[Tuple[str, bool, str]]:
    """Valida conexión a Redis (rate limiting)"""
    print_header("SUITE 2: REDIS (RATE LIMITING)")
    results = []

    try:
        # Test 2.1: Conexión a Redis
        r = redis.Redis(host=Config.REDIS_HOST, port=Config.REDIS_PORT, decode_responses=True)
        ping = r.ping()
        results.append((
            "Conexión a Redis exitosa",
            ping,
            f"Host: {Config.REDIS_HOST}:{Config.REDIS_PORT}"
        ))

        # Test 2.2: Set/Get funcional
        test_key = "tijuca_test_key"
        r.set(test_key, "test_value", ex=10)
        value = r.get(test_key)
        results.append((
            "Redis SET/GET funcional",
            value == "test_value",
            "" if value == "test_value" else f"Esperado 'test_value', obtenido '{value}'"
        ))
        r.delete(test_key)

    except Exception as e:
        results.append(("Conexión a Redis", False, f"Error: {e}"))
        results.append(("Redis SET/GET funcional", False, "Conexión fallida"))

    # Imprimir resultados
    for test_name, passed, details in results:
        print_test(test_name, passed, details)

    return results


# =====================================================================
# SUITE 3: API VALIDATION
# =====================================================================

def validate_api() -> List[Tuple[str, bool, str]]:
    """Valida endpoints de API"""
    print_header("SUITE 3: API SECURITY")
    results = []

    # Test 3.1: Health check (sin autenticación)
    try:
        response = requests.get(f"{Config.API_BASE_URL}/health", timeout=5)
        health_ok = response.status_code == 200 and response.json().get("status") == "healthy"
        results.append((
            "Health check endpoint funcional",
            health_ok,
            f"Status: {response.status_code}"
        ))
    except Exception as e:
        results.append(("Health check endpoint funcional", False, f"Error: {e}"))
        results.append(("Login endpoint funcional", False, "API no responde"))
        results.append(("JWT válido permite acceso", False, "API no responde"))
        results.append(("JWT inválido es rechazado", False, "API no responde"))
        results.append(("SQL Injection es bloqueado", False, "API no responde"))

        for test_name, passed, details in results:
            print_test(test_name, passed, details)
        return results

    # Test 3.2: Login endpoint
    try:
        login_data = {"api_key": Config.TENANT_A_API_KEY}
        response = requests.post(
            f"{Config.API_BASE_URL}/auth/login",
            json=login_data,
            timeout=5
        )
        login_ok = response.status_code == 200 and "access_token" in response.json()
        jwt_token = response.json().get("access_token") if login_ok else None

        results.append((
            "Login endpoint funcional",
            login_ok,
            f"Status: {response.status_code}"
        ))
    except Exception as e:
        results.append(("Login endpoint funcional", False, f"Error: {e}"))
        jwt_token = None

    # Test 3.3: JWT válido permite acceso
    if jwt_token:
        try:
            headers = {"Authorization": f"Bearer {jwt_token}"}
            response = requests.get(
                f"{Config.API_BASE_URL}/api/ventas",
                headers=headers,
                timeout=5
            )
            jwt_valid = response.status_code == 200
            results.append((
                "JWT válido permite acceso",
                jwt_valid,
                f"Status: {response.status_code}"
            ))
        except Exception as e:
            results.append(("JWT válido permite acceso", False, f"Error: {e}"))
    else:
        results.append(("JWT válido permite acceso", False, "No se obtuvo JWT"))

    # Test 3.4: JWT inválido es rechazado
    try:
        invalid_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.INVALID.TOKEN"
        headers = {"Authorization": f"Bearer {invalid_token}"}
        response = requests.get(
            f"{Config.API_BASE_URL}/api/ventas",
            headers=headers,
            timeout=5
        )
        jwt_rejected = response.status_code == 401
        results.append((
            "JWT inválido es rechazado",
            jwt_rejected,
            f"Status: {response.status_code} (esperado 401)"
        ))
    except Exception as e:
        results.append(("JWT inválido es rechazado", False, f"Error: {e}"))

    # Test 3.5: SQL Injection es bloqueado
    if jwt_token:
        try:
            headers = {"Authorization": f"Bearer {jwt_token}"}
            response = requests.get(
                f"{Config.API_BASE_URL}/api/ventas?search=test'; DROP TABLE ventas; --",
                headers=headers,
                timeout=5
            )
            sql_blocked = response.status_code == 400
            results.append((
                "SQL Injection es bloqueado",
                sql_blocked,
                f"Status: {response.status_code} (esperado 400)"
            ))
        except Exception as e:
            results.append(("SQL Injection es bloqueado", False, f"Error: {e}"))
    else:
        results.append(("SQL Injection es bloqueado", False, "No se obtuvo JWT"))

    # Imprimir resultados
    for test_name, passed, details in results:
        print_test(test_name, passed, details)

    return results


# =====================================================================
# SUITE 4: CONFIGURATION VALIDATION
# =====================================================================

def validate_configuration() -> List[Tuple[str, bool, str]]:
    """Valida configuración general"""
    print_header("SUITE 4: CONFIGURATION")
    results = []

    # Test 4.1: Variables de entorno críticas
    critical_vars = ["DATABASE_URL", "JWT_SECRET_KEY", "REDIS_URL"]
    for var in critical_vars:
        exists = os.getenv(var) is not None
        results.append((
            f"Variable de entorno {var} configurada",
            exists,
            "" if exists else "Configurar en .env"
        ))

    # Test 4.2: JWT_SECRET_KEY no es el default
    jwt_secret = os.getenv("JWT_SECRET_KEY", "")
    is_secure = (
        len(jwt_secret) >= 32 and
        "CHANGE_THIS" not in jwt_secret
    )
    results.append((
        "JWT_SECRET_KEY es seguro (no default)",
        is_secure,
        f"Longitud: {len(jwt_secret)} chars (mínimo 32)"
    ))

    # Test 4.3: ENVIRONMENT no es 'production' (para testing)
    env = os.getenv("ENVIRONMENT", "development")
    is_dev = env != "production"
    results.append((
        "ENVIRONMENT = development/staging (no production)",
        is_dev,
        f"ENVIRONMENT={env}"
    ))

    # Imprimir resultados
    for test_name, passed, details in results:
        print_test(test_name, passed, details)

    return results


# =====================================================================
# MAIN
# =====================================================================

def main():
    """Ejecuta todas las validaciones"""
    print("\n")
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("╔════════════════════════════════════════════════════════════════════╗")
    print("║         TIJUCA TRAVEL - SECURITY VALIDATION SCRIPT                ║")
    print("║                                                                    ║")
    print("║  Este script valida que todas las capas de seguridad estén        ║")
    print("║  correctamente configuradas antes del lanzamiento.                 ║")
    print("╚════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.RESET}\n")

    print(f"{Colors.YELLOW}Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Colors.RESET}")
    print(f"{Colors.YELLOW}Ambiente: {os.getenv('ENVIRONMENT', 'development')}{Colors.RESET}\n")

    # Ejecutar suites
    all_results = {}
    all_results["1. Database Security"] = validate_database()
    all_results["2. Redis (Rate Limiting)"] = validate_redis()
    all_results["3. API Security"] = validate_api()
    all_results["4. Configuration"] = validate_configuration()

    # Resumen
    success = print_summary(all_results)

    # Exit code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
