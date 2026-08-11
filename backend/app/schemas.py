from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # "admin", "organization", "single_person", "government", "hospital", "shelter"
    organization_name: Optional[str] = None
    phone: Optional[str] = None

    @field_validator('email')
    @classmethod
    def email_must_have_at(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email address')
        return v.lower().strip()

    @field_validator('password')
    @classmethod
    def password_minimum_length(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def email_lower(cls, v):
        return v.lower().strip()

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    organization_name: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

class UserWithPasswordResponse(UserResponse):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# --- Disaster Schemas ---
class DisasterCreate(BaseModel):
    title: str
    disaster_type: str
    severity: str
    affected_districts: str
    expected_duration: str
    lat: Optional[float] = 23.8103
    lng: Optional[float] = 90.4125

class DisasterResponse(DisasterCreate):
    id: int
    status: str
    declared_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Inventory Schemas ---
class InventoryItemCreate(BaseModel):
    item_name: str
    category: str
    quantity: float = Field(ge=0)
    unit: str
    minimum_threshold: float = Field(ge=0)
    warehouse_location: str
    warehouse_lat: Optional[float] = 23.8103
    warehouse_lng: Optional[float] = 90.4125

class InventoryItemUpdate(BaseModel):
    quantity: Optional[float] = Field(default=None, ge=0)
    minimum_threshold: Optional[float] = Field(default=None, ge=0)
    warehouse_location: Optional[str] = None

class InventoryItemResponse(InventoryItemCreate):
    id: int
    organization_name: str
    updated_at: datetime
    is_low_stock: bool = False

    model_config = {"from_attributes": True}


# --- Resource Request Schemas ---
class ResourceRequestCreate(BaseModel):
    item_category: str
    item_name: str
    quantity: float = Field(gt=0)
    unit: str
    priority: str
    destination_address: str
    destination_lat: Optional[float] = 23.8103
    destination_lng: Optional[float] = 90.4125

class DispatchOptimizationInput(BaseModel):
    warehouse_id: int
    distance_meters: float = Field(gt=0)
    duration_seconds: float = Field(gt=0)
    provider: str = "Google Distance Matrix API"


class ResourceRequestResponse(ResourceRequestCreate):
    id: int
    requester_name: str
    requester_email: str
    requester_role: str
    status: str
    assigned_warehouse: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    estimated_distance_km: Optional[float] = None
    estimated_arrival_minutes: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Emergency Alert Schemas ---
class EmergencyAlertCreate(BaseModel):
    title: str
    message: str
    alert_level: str
    affected_area: str

class EmergencyAlertResponse(EmergencyAlertCreate):
    id: int
    published_by: str
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Hospital Role Schemas ---
class HospitalPatientStatisticsUpdate(BaseModel):
    current_patients: int = Field(ge=0)
    critical_patients: int = Field(ge=0)
    new_emergency_patients: int = Field(ge=0)


class HospitalCapacityUpdate(BaseModel):
    total_beds: int = Field(ge=0)
    occupied_beds: int = Field(ge=0)
    emergency_beds: int = Field(ge=0)
    staff_on_duty: int = Field(ge=0)
    ambulances_available: int = Field(ge=0)
    emergency_capacity_status: str = "Available"


class HospitalStatusResponse(BaseModel):
    id: int
    user_id: int
    hospital_name: str
    current_patients: int
    critical_patients: int
    new_emergency_patients: int
    total_beds: int
    occupied_beds: int
    emergency_beds: int
    staff_on_duty: int
    ambulances_available: int
    emergency_capacity_status: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class HospitalExpenditureCreate(BaseModel):
    category: str
    amount: float = Field(gt=0)
    description: str
    report_period: Optional[str] = None


class HospitalExpenditureResponse(HospitalExpenditureCreate):
    id: int
    user_id: int
    hospital_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Disaster Shelter Role Schemas ---
class ShelterCapacityUpdate(BaseModel):
    total_capacity: int = Field(ge=0)


class ShelterOccupancyUpdate(BaseModel):
    current_occupancy: int = Field(ge=0)
    occupancy_status: Optional[str] = None


class ShelterStatusResponse(BaseModel):
    id: int
    user_id: int
    shelter_name: str
    total_capacity: int
    current_occupancy: int
    occupancy_status: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class ShelterResourceCreate(BaseModel):
    item_name: str
    category: str
    quantity: float = Field(ge=0)
    unit: str
    minimum_threshold: float = Field(default=0, ge=0)


class ShelterResourceUpdate(BaseModel):
    quantity: Optional[float] = Field(default=None, ge=0)
    minimum_threshold: Optional[float] = Field(default=None, ge=0)


class ShelterResourceResponse(ShelterResourceCreate):
    id: int
    user_id: int
    shelter_name: str
    updated_at: datetime
    is_low_stock: bool = False

    model_config = {"from_attributes": True}


class ShelterShortageCreate(BaseModel):
    item_name: str
    required_quantity: float = Field(gt=0)
    available_quantity: float = Field(default=0, ge=0)
    unit: str
    severity: str = "High"
    notes: Optional[str] = None


class ShelterShortageResponse(ShelterShortageCreate):
    id: int
    user_id: int
    shelter_name: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ShelterDistributionCreate(BaseModel):
    resource_id: int
    quantity: float = Field(gt=0)
    recipient_group: str
    notes: Optional[str] = None


class ShelterDistributionResponse(BaseModel):
    id: int
    user_id: int
    shelter_name: str
    resource_id: Optional[int] = None
    item_name: str
    quantity: float
    unit: str
    recipient_group: str
    notes: Optional[str] = None
    distributed_at: datetime

    model_config = {"from_attributes": True}
