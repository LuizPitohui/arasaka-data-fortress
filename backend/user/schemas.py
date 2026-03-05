import uuid
from ninja import Schema
from typing import Optional

class UserSchema(Schema):
    """
    Define como os dados do usuário são retornados para o frontend.
    """
    id: uuid.UUID  # Se o seu ArasakaUser usa ID numérico, mude para 'int'
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    # Campos específicos do contexto Arasaka/Cyberpunk
    corp_id: Optional[str] = None  # Ex: "ARA-7734"
    department: Optional[str] = None # Ex: "Counter-Intel"
    
    # URL assinada do avatar (S3/MinIO) ou caminho local
    avatar: Optional[str] = None 

class AvatarSchema(Schema):
    """
    Retorno simples após upload do avatar.
    """
    url: str

class ErrorSchema(Schema):
    """
    Padronização de erros (opcional, mas boa prática).
    """
    detail: str