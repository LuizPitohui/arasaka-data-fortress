from ninja import NinjaAPI
from backend.core.api import router as auth_router   # O arquivo que você acabou de me mandar
from backend.drive.api import router as drive_router # O arquivo do Drive
from backend.user.api import router as user_router   # O novo arquivo de User

# Aqui nasce a API Principal
api = NinjaAPI(
    title="Arasaka Data Fortress API",
    version="2.0.77",
    description="Interface neural central."
)

# Registrando os Roteadores (Os "Músicos")
# As URLs ficarão: 
# /api/auth/login
# /api/drive/files
# /api/user/me

api.add_router("/auth", auth_router)   # Rotas do Core (Login)
api.add_router("/drive", drive_router) # Rotas do Drive
api.add_router("/user", user_router)   # Rotas do User (RESOLVE O 404)