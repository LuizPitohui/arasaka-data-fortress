"""
Django settings for Arasaka Data Fortress (Project: Mikoshi).

Optimized for: Django 6.0.2 | Python 3.13 | Async | Security
"""

from pathlib import Path
import os
from dotenv import load_dotenv # Requer: poetry add python-dotenv

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# ==============================================================================
# SECURITY & CONFIGURATION
# ==============================================================================

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-dev-key-arasaka-fallback")

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv("DEBUG", "True") == "True"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")


# ==============================================================================
# APPLICATION DEFINITION
# ==============================================================================

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # --- ARSENAL TÁTICO (Third Party) ---
    "corsheaders",  # Permite conexão com o Frontend React
    "ninja",        # API Fast & Async
    
    # --- MÓDULOS ARASAKA (Local Apps) ---
    "core",         # Autenticação e Usuários
    "drive",        # Lógica de Arquivos e MinIO
    "user",         # API de Usuários
    
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    
    # CORS deve vir antes do CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",
    
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
# Para produção futura com Uvicorn, usaremos config.asgi.application


# ==============================================================================
# DATABASE (PostgreSQL Connected)
# ==============================================================================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "arasaka_db"),
        "USER": os.getenv("DB_USER", "arasaka_admin"),
        "PASSWORD": os.getenv("DB_PASSWORD", "secure_password"),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}


# ==============================================================================
# AUTHENTICATION & SECURITY
# ==============================================================================

# Modelo de Usuário Customizado (CRÍTICO: Definir antes da primeira migração)
AUTH_USER_MODEL = "core.ArasakaUser"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# ==============================================================================
# INTERNATIONALIZATION
# ==============================================================================

LANGUAGE_CODE = "pt-br"

# Sincronizado com Base de Operações (Manaus)
TIME_ZONE = "America/Manaus"

USE_I18N = True
USE_TZ = True


# ==============================================================================
# STATIC & MEDIA FILES
# ==============================================================================

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Onde os arquivos temporários ou locais serão salvos antes de ir pro MinIO
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"


# ==============================================================================
# API & CORS CONFIGURATION
# ==============================================================================

# Configuração de CORS (Permitir desenvolvimento local)
CORS_ALLOW_ALL_ORIGINS = True  # Em produção, mudar para False e usar CORS_ALLOWED_ORIGINS
CORS_ALLOW_CREDENTIALS = True

# ==============================================================================
# ARASAKA SERVICES CONFIG (MinIO)
# ==============================================================================

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "arasaka-vault")
MINIO_USE_SSL = os.getenv("MINIO_USE_SSL", "False") == "True"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"