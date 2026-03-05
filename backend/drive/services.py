from minio import Minio
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
import uuid
import os

class MinioStorage:
    def __init__(self):
        # Inicializa a conexão com o MinIO usando as configs do settings.py
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT.replace('http://', '').replace('https://', ''),
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL
        )
        self.bucket = settings.MINIO_BUCKET_NAME
        
        # Garante que o bucket existe (Protocolo de Segurança)
        if not self.client.bucket_exists(self.bucket):
            self.client.make_bucket(self.bucket)

    def upload_file(self, file: UploadedFile, owner_id: str) -> str:
        """
        Envia o arquivo para o cofre.
        Retorna a 'key' (caminho) do arquivo no MinIO.
        """
        # Gera um caminho seguro: uuid_usuario/uuid_arquivo.ext
        file_ext = os.path.splitext(file.name)[1]
        object_name = f"{owner_id}/{uuid.uuid4()}{file_ext}"
        
        # Upload direto da memória (stream)
        self.client.put_object(
            bucket_name=self.bucket,
            object_name=object_name,
            data=file,
            length=file.size,
            content_type=file.content_type
        )
        
        return object_name

    def generate_presigned_url(self, object_name: str) -> str:
        """
        Gera um link temporário para download (expira em 1 hora).
        O arquivo vem direto do MinIO, não passa pelo Django na volta.
        """
        return self.client.get_presigned_url(
            "GET",
            self.bucket,
            object_name,
            expires=timedelta(hours=1)
        )

    def delete_file(self, object_name: str):
        self.client.remove_object(self.bucket, object_name)

# Instância singleton para ser importada
storage = MinioStorage()