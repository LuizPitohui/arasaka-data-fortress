import uuid
from django.db import models
from django.db.models import Q
from django.conf import settings
# A importação de ArasakaUser não estava sendo usada diretamente (settings.AUTH_USER_MODEL é mais seguro), 
# mas mantive caso você precise em métodos futuros.
from core.models import ArasakaUser 

class TimeStampedModel(models.Model):
    """Classe abstrata para auditar criação e modificação."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Folder(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    
    # Dono da pasta
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='folders'
    )
    
    # Pasta pai (se for null, é a raiz/root)
    parent = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='subfolders'
    )
    
    # Cor da pasta para a UI (Neon Red, Cyber Blue, etc)
    color = models.CharField(max_length=7, default="#424242") 

    # Se foi favoritado/marcado (Consistência com File)
    is_starred = models.BooleanField(default=False)

    # CORREÇÃO DO ERRO 500: Campo adicionado
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} (Owner: {self.owner.username})"

    class Meta:
        # Garante performance na listagem principal
        indexes = [
            models.Index(fields=['parent', 'is_deleted']),
            models.Index(fields=['owner', 'parent']),
        ]
        constraints = [
            # Impede pastas com mesmo nome no mesmo nível, MAS apenas se NÃO estiverem deletadas.
            # Isso permite criar uma pasta "Trabalho" mesmo se houver uma "Trabalho" na lixeira.
            models.UniqueConstraint(
                fields=['owner', 'parent', 'name'], 
                condition=Q(is_deleted=False),
                name='unique_folder_per_parent_active'
            )
        ]

class File(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    
    # Tamanho em Bytes
    size = models.BigIntegerField()
    
    # Tipo MIME (ex: application/pdf)
    content_type = models.CharField(max_length=100)
    
    # Caminho real no MinIO (ex: user_id/uuid/relatorio.pdf)
    minio_key = models.CharField(max_length=500, unique=True)
    
    folder = models.ForeignKey(
        Folder, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='files'
    )
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='files'
    )
    
    # Segurança: Hash SHA256 para verificar integridade
    file_hash = models.CharField(max_length=64, blank=True, null=True)
    
    # Se foi favoritado/marcado
    is_starred = models.BooleanField(default=False)
    
    # Se está na lixeira
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    class Meta:
        indexes = [
            models.Index(fields=['folder', 'is_deleted']),
        ]