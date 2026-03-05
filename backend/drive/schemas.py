from ninja import Schema
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class UserSchema(Schema):
    id: int  # Ou uuid.UUID se seu usuário usar UUID
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class AvatarSchema(Schema):
    url: str

class FolderOut(Schema):
    id: UUID
    name: str
    parent_id: Optional[UUID] = None
    color: str
    created_at: datetime
    is_starred: bool # NOVO
    is_deleted: bool # NOVO

class FileOut(Schema):
    id: UUID
    name: str
    size: int
    content_type: str
    folder_id: Optional[UUID] = None
    created_at: datetime
    is_starred: bool # NOVO
    is_deleted: bool # NOVO

class FolderCreate(Schema):
    name: str
    parent_id: Optional[UUID] = None
    color: Optional[str] = "#424242"