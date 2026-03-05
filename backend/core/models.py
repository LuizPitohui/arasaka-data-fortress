import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class ArasakaUser(AbstractUser):
    """
    Modelo de usuário personalizado para o ecossistema Arasaka.
    """
    class SecurityClearance(models.IntegerChoices):
        CIVILIAN = 0, 'Civilian / Guest'
        EMPLOYEE = 1, 'Standard Employee'
        NETRUNNER = 2, 'Netrunner / SysAdmin'
        EXECUTIVE = 3, 'Executive / Board Member'

    # ID UUID para segurança contra enumeração
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # ID Corporativo (ex: ARASAKA-8842)
    corp_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    
    clearance_level = models.IntegerField(
        choices=SecurityClearance.choices, 
        default=SecurityClearance.CIVILIAN
    )
    
    # Campo para futura autenticação biométrica
    biometric_hash = models.CharField(max_length=255, blank=True, null=True)

    # --- NOVO CAMPO: AVATAR ---
    # Necessário para o Protocolo Identity
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return f"[{self.corp_id or 'GUEST'}] {self.username}"

    class Meta:
        db_table = 'arasaka_users'
        verbose_name = 'Operative'
        verbose_name_plural = 'Operatives'