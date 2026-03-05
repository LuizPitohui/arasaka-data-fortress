from django.contrib import admin
from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from ninja import NinjaAPI
from ninja.security import django_auth

# Importação dos Roteadores
from drive.api import router as drive_router
from core.api import router as auth_router
from user.api import router as user_router

# =======================================================
# CONFIGURAÇÃO DA API
# =======================================================
# Removemos o 'csrf=False' que sua versão não aceita.
# Mantemos 'auth=django_auth' para que o request.user funcione (evita o erro 500).
api = NinjaAPI(
    title="Arasaka Data Fortress API",
    version="1.0.0",
    description="Secure Interface for Project Mikoshi",
    auth=django_auth  # Protege a API e preenche o request.user
)

# =======================================================
# REGISTRO DAS ROTAS
# =======================================================
api.add_router("/drive", drive_router) # Herda autenticação
api.add_router("/user", user_router)   # Herda autenticação

# O login deve ser público (sobrescreve o auth global)
api.add_router("/auth", auth_router, auth=None) 

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # VOLTAMOS AO PADRÃO: Sem csrf_exempt aqui.
    # Isso resolve o 404.
    path("api/", api.urls), 
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)