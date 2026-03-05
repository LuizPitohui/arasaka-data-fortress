from typing import List
from ninja import Router, UploadedFile, File as NinjaFile
from django.shortcuts import get_object_or_404
from django.db.models import Sum
from datetime import timedelta
from .models import File, Folder
from .schemas import FileOut, FolderOut, FolderCreate
from .services import storage
from core.models import ArasakaUser

router = Router()

# ===================================================================
# 1. ESTATÍSTICAS (STATS)
# ===================================================================
@router.get("/stats")
def get_storage_stats(request):
    user = request.user  # Usa o usuário logado
    
    # Soma apenas arquivos NÃO deletados
    total_bytes = File.objects.filter(owner=user, is_deleted=False).aggregate(Sum('size'))['size__sum'] or 0
    limit_bytes = 10 * 1024 * 1024 * 1024  # 10GB Hardcoded
    
    return {
        "used_bytes": total_bytes, 
        "limit_bytes": limit_bytes,
        "used_percentage": round((total_bytes / limit_bytes) * 100, 2)
    }

# ===================================================================
# 2. LISTAGEM INTELIGENTE (FILES & FOLDERS)
# ===================================================================
@router.get("/files", response=List[FileOut])
def list_files(request, folder_id: str = None, search: str = None, starred: bool = False, trash: bool = False):
    user = request.user
    qs = File.objects.filter(owner=user)

    # 1. Filtro Global: Lixeira ou Ativos
    if trash:
        qs = qs.filter(is_deleted=True)
    else:
        qs = qs.filter(is_deleted=False)

    # 2. Busca (Prioridade sobre pasta)
    if search:
        return qs.filter(name__icontains=search)
    
    # 3. Favoritos (Apenas se não for lixeira)
    if starred and not trash:
        return qs.filter(is_starred=True)

    # 4. Navegação por Pasta (Trata 'null' do JS)
    if folder_id in ['null', '', None]:
        return qs.filter(folder__isnull=True) # Raiz
    else:
        return qs.filter(folder_id=folder_id)

@router.get("/folders", response=List[FolderOut])
def list_folders(request, parent_id: str = None, trash: bool = False):
    user = request.user
    qs = Folder.objects.filter(owner=user)

    if trash:
        # Na lixeira, mostramos tudo plano ou apenas os deletados explicitamente
        return qs.filter(is_deleted=True)
    
    # Pastas normais
    qs = qs.filter(is_deleted=False)

    if parent_id in ['null', '', None]:
        return qs.filter(parent__isnull=True)
    else:
        return qs.filter(parent_id=parent_id)

# ===================================================================
# 3. OPERAÇÕES DE ARQUIVO
# ===================================================================
@router.post("/upload", response=FileOut)
def upload_file(request, file: UploadedFile = NinjaFile(...), folder_id: str = None):
    user = request.user
    
    # Tratamento do folder_id vindo como string "null"
    real_folder_id = None
    if folder_id and folder_id not in ['null', '']:
        real_folder_id = folder_id

    # Upload para o MinIO
    minio_key = storage.upload_file(file, str(user.id))
    
    # Criação no Banco
    file_record = File.objects.create(
        name=file.name, 
        size=file.size, 
        content_type=file.content_type, 
        minio_key=minio_key, 
        owner=user, 
        folder_id=real_folder_id,
        is_deleted=False
    )
    return file_record

@router.post("/folders", response=FolderOut)
def create_folder(request, data: FolderCreate):
    user = request.user
    
    parent = None
    if data.parent_id and data.parent_id not in ['null', '']:
        parent = get_object_or_404(Folder, id=data.parent_id, owner=user)

    folder = Folder.objects.create(
        name=data.name, 
        parent=parent, 
        color=data.color, 
        owner=user,
        is_deleted=False
    )
    return folder

@router.post("/files/{file_id}/star", response={200: bool})
def toggle_star(request, file_id: str):
    f = get_object_or_404(File, id=file_id, owner=request.user)
    f.is_starred = not f.is_starred
    f.save()
    return 200, f.is_starred

@router.post("/files/{file_id}/restore", response={200: None})
def restore_file(request, file_id: str):
    f = get_object_or_404(File, id=file_id, owner=request.user)
    f.is_deleted = False
    f.save()
    return 200, None

@router.delete("/{file_id}", response={204: None})
def delete_file(request, file_id: str, hard: bool = False):
    f = get_object_or_404(File, id=file_id, owner=request.user)
    
    if hard:
        # Expurgo Total
        try:
            storage.delete_file(f.minio_key)
        except:
            pass # Continua para deletar do banco mesmo se falhar no storage
        f.delete()
    else:
        # Soft Delete
        f.is_deleted = True
        f.is_starred = False # Remove dos favoritos ao deletar
        f.save()
        
    return 204, None

@router.get("/folders/{folder_id}", response=FolderOut)
def get_folder_details(request, folder_id: str):
    return get_object_or_404(Folder, id=folder_id, owner=request.user)

@router.get("/download/{file_id}")
def get_download_link(request, file_id: str):
    f = get_object_or_404(File, id=file_id, owner=request.user)
    url = storage.client.presigned_get_object(storage.bucket, f.minio_key, expires=timedelta(hours=1))
    return {"download_url": url, "expires": "1h"}