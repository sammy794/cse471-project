from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "admin", "organization", "single_person", "government", "hospital", "shelter"
    organization_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DisasterEvent(Base):
    __tablename__ = "disaster_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    disaster_type = Column(String, nullable=False)  # Flood, Cyclone, Earthquake, Landslide, Severe Heatwave
    severity = Column(String, nullable=False)  # Low, Medium, High, Critical
    affected_districts = Column(String, nullable=False)
    expected_duration = Column(String, nullable=False)
    status = Column(String, default="Active")  # Active, Contained, Resolved
    declared_by = Column(String, nullable=False)
    lat = Column(Float, nullable=False, default=23.8103)
    lng = Column(Float, nullable=False, default=90.4125)
    created_at = Column(DateTime, default=datetime.utcnow)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    organization_name = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Food, Water, Medicine, Blankets, Generators, Shelter Gear
    quantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False)  # kg, liters, units, boxes, kits
    minimum_threshold = Column(Float, nullable=False, default=50.0)
    warehouse_location = Column(String, nullable=False)
    warehouse_lat = Column(Float, nullable=False, default=23.8103)
    warehouse_lng = Column(Float, nullable=False, default=90.4125)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ResourceRequest(Base):
    __tablename__ = "resource_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_name = Column(String, nullable=False)
    requester_email = Column(String, nullable=False)
    requester_role = Column(String, nullable=False)
    item_category = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    priority = Column(String, default="Medium")  # Low, Medium, High, Critical
    status = Column(String, default="Pending")  # Pending, Approved, In-Transit, Delivered, Rejected
    destination_address = Column(String, nullable=False)
    destination_lat = Column(Float, default=23.8103)
    destination_lng = Column(Float, default=90.4125)
    assigned_warehouse = Column(String, nullable=True)
    assigned_vehicle = Column(String, nullable=True)
    estimated_distance_km = Column(Float, nullable=True)
    estimated_arrival_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    alert_level = Column(String, nullable=False)  # Warning, Severe, Evacuation, Information
    affected_area = Column(String, nullable=False)
    published_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# --- Emergency Resource Request: Hospital role ---
class HospitalStatus(Base):
    __tablename__ = "hospital_statuses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    hospital_name = Column(String, nullable=False)
    current_patients = Column(Integer, nullable=False, default=0)
    critical_patients = Column(Integer, nullable=False, default=0)
    new_emergency_patients = Column(Integer, nullable=False, default=0)
    total_beds = Column(Integer, nullable=False, default=0)
    occupied_beds = Column(Integer, nullable=False, default=0)
    emergency_beds = Column(Integer, nullable=False, default=0)
    staff_on_duty = Column(Integer, nullable=False, default=0)
    ambulances_available = Column(Integer, nullable=False, default=0)
    emergency_capacity_status = Column(String, nullable=False, default="Available")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class HospitalExpenditure(Base):
    __tablename__ = "hospital_expenditures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    hospital_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    report_period = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# --- Emergency Resource Request: Disaster Shelter role ---
class ShelterStatus(Base):
    __tablename__ = "shelter_statuses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    shelter_name = Column(String, nullable=False)
    total_capacity = Column(Integer, nullable=False, default=0)
    current_occupancy = Column(Integer, nullable=False, default=0)
    occupancy_status = Column(String, nullable=False, default="Available")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShelterResource(Base):
    __tablename__ = "shelter_resources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    shelter_name = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    quantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False)
    minimum_threshold = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ShelterShortage(Base):
    __tablename__ = "shelter_shortages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    shelter_name = Column(String, nullable=False)
    item_name = Column(String, nullable=False)
    required_quantity = Column(Float, nullable=False)
    available_quantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String, nullable=False)
    severity = Column(String, nullable=False, default="High")
    notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="Open")
    created_at = Column(DateTime, default=datetime.utcnow)


class ShelterDistribution(Base):
    __tablename__ = "shelter_distributions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    shelter_name = Column(String, nullable=False)
    resource_id = Column(Integer, ForeignKey("shelter_resources.id"), nullable=True)
    item_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String, nullable=False)
    recipient_group = Column(String, nullable=False)
    notes = Column(Text, nullable=True)
    distributed_at = Column(DateTime, default=datetime.utcnow)
