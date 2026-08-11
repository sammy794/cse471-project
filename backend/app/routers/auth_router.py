from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])

REGISTERABLE_ROLES = ["organization", "single_person", "government", "hospital", "shelter"]

@router.post("/register", response_model=schemas.Token)
def register_user(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    if user_in.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be created through registration."
        )

    if user_in.role not in REGISTERABLE_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(REGISTERABLE_ROLES)}"
        )

    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )

    db_user = models.User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        organization_name=user_in.organization_name if user_in.role in ["organization", "hospital", "shelter"] else None,
        phone=user_in.phone
    )
    db.add(db_user)
    db.flush()

    # Hospital and shelter accounts receive their own operational profile at
    # registration time. Existing roles keep their previous behaviour.
    if db_user.role == "hospital":
        db.add(models.HospitalStatus(
            user_id=db_user.id,
            hospital_name=db_user.organization_name or db_user.full_name
        ))
    elif db_user.role == "shelter":
        db.add(models.ShelterStatus(
            user_id=db_user.id,
            shelter_name=db_user.organization_name or db_user.full_name
        ))

    db.commit()
    db.refresh(db_user)

    token = create_access_token({"sub": db_user.id, "role": db_user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": db_user
    }


@router.post("/login", response_model=schemas.Token)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    token = create_access_token({"sub": user.id, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=schemas.UserResponse)
def get_my_profile(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.delete("/me")
def delete_my_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.delete(current_user)
    db.commit()
    return {"message": "User account deleted successfully"}
