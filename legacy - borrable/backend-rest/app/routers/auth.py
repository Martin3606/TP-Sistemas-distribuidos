from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.auth.jwt import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Autentica un usuario por email y contraseña.
    Devuelve un JWT Token con su rol (ADMIN / CLIENTE) y datos asociados.
    """
    usuario = db.query(Usuario).filter(Usuario.email == request.email).first()
    if not usuario or not verify_password(request.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas (email o contraseña incorrectos)"
        )
    
    nombre_usuario = None
    if usuario.cliente:
        nombre_usuario = f"{usuario.cliente.nombre} {usuario.cliente.apellido}"
    elif usuario.rol.value == "ADMIN":
        nombre_usuario = "Administrador"

    token_data = {
        "user_id": usuario.id,
        "email": usuario.email,
        "rol": usuario.rol.value,
        "cliente_id": usuario.cliente_id
    }
    
    access_token = create_access_token(token_data)

    user_out = UserOut(
        id=usuario.id,
        email=usuario.email,
        rol=usuario.rol.value,
        cliente_id=usuario.cliente_id,
        nombre=nombre_usuario
    )

    return TokenResponse(access_token=access_token, user=user_out)


@router.get("/me", response_model=UserOut)
def get_me(current_user: Usuario = Depends(get_current_user)):
    """Retorna los datos del usuario logueado en base al token."""
    nombre_usuario = None
    if current_user.cliente:
        nombre_usuario = f"{current_user.cliente.nombre} {current_user.cliente.apellido}"
    elif current_user.rol.value == "ADMIN":
        nombre_usuario = "Administrador"

    return UserOut(
        id=current_user.id,
        email=current_user.email,
        rol=current_user.rol.value,
        cliente_id=current_user.cliente_id,
        nombre=nombre_usuario
    )
