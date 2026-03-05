from ninja import Router, Schema
from django.contrib.auth import authenticate
from django.http import HttpRequest
# Removida a importação de models se não for estritamente necessária para evitar ciclos, 
# mas mantemos se precisar de dados extras.

router = Router()

# O que o Frontend envia
class AuthRequest(Schema):
    username: str
    password: str

# O que o Backend devolve (Schema de Sucesso)
class AuthResponse(Schema):
    id: str
    username: str
    corp_id: str | None
    clearance_level: int

@router.post("/login", response={200: AuthResponse, 401: None})
def login(request: HttpRequest, data: AuthRequest):
    # Verifica as credenciais no banco
    user = authenticate(username=data.username, password=data.password)
    
    if user:
        # Sucesso: Retorna os dados do agente
        return {
            "id": str(user.id),
            "username": user.username,
            "corp_id": user.corp_id,
            "clearance_level": user.clearance_level
        }
    
    # Falha: Retorna 401 Unauthorized
    return 401, None