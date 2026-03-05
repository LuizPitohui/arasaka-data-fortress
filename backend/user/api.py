from ninja import Router, UploadedFile, File as NinjaFile
from datetime import timedelta
from django.conf import settings

# CORREÇÃO DE IMPORTS (Removido 'backend.')
from user.schemas import UserSchema 
from drive.services import storage  

router = Router()

@router.get("/me", response=UserSchema)
def get_me(request):
    user = request.user
    
    # Lógica de Avatar
    avatar_url = None
    
    # Verifica se o usuário tem o campo avatar e se ele não está vazio
    if hasattr(user, 'avatar') and user.avatar:
        try:
            # Gera URL assinada (Presigned URL) do MinIO
            # user.avatar deve conter apenas a key, ex: "avatars/1_file.jpg"
            avatar_url = storage.client.presigned_get_object(
                storage.bucket, 
                str(user.avatar), 
                expires=timedelta(hours=24)
            )
        except Exception as e:
            # Em produção, use logging.error(f"Erro MinIO: {e}")
            avatar_url = None

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar": avatar_url,
        # Adicionei estes campos para garantir compatibilidade com o UserSchema completo
        "corp_id": getattr(user, 'corp_id', None),
        "department": getattr(user, 'department', None)
    }

@router.post("/avatar", response={200: str})
def upload_avatar(request, file: UploadedFile = NinjaFile(...)):
    user = request.user
    
    # Define a chave única no MinIO: avatars/user_id_nomearquivo
    # Usamos str(user.id) para garantir que funcione com UUID ou Int
    key = f"avatars/{user.id}_{file.name}"
    
    # Upload para o MinIO
    # file.file é o objeto binário em memória/disco
    storage.client.put_object(
        storage.bucket, 
        key, 
        file.file, 
        file.size, 
        content_type=file.content_type
    )
    
    # Salva a referência no banco de dados
    if hasattr(user, 'avatar'):
        user.avatar = key
        user.save()
    
    # Gera URL de retorno imediato (válida por 7 dias para cache local)
    url = storage.client.presigned_get_object(
        storage.bucket, 
        key, 
        expires=timedelta(days=7)
    )
    
    return 200, url