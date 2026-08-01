from datetime import datetime, timezone
from typing import Any, List, Optional
from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy 2.0 ORM models."""
    pass


def utc_now() -> datetime:
    """Returns timezone-aware current UTC time."""
    return datetime.now(timezone.utc)


class User(Base):
    """
    Users table representing store owners / system users.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    businesses: Mapped[List["Business"]] = relationship(
        "Business", back_populates="owner", cascade="all, delete-orphan"
    )
    import_histories: Mapped[List["ImportHistory"]] = relationship(
        "ImportHistory", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.__dict__.get('id')}, email='{self.__dict__.get('email')}')>"


class Business(Base):
    """
    Business table representing retail store entity owned by a user.
    """
    __tablename__ = "businesses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    business_type: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="businesses")
    profile: Mapped[Optional["BusinessProfile"]] = relationship(
        "BusinessProfile", back_populates="business", uselist=False, cascade="all, delete-orphan"
    )
    suppliers: Mapped[List["Supplier"]] = relationship(
        "Supplier", back_populates="business", cascade="all, delete-orphan"
    )
    products: Mapped[List["Product"]] = relationship(
        "Product", back_populates="business", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[List["Inventory"]] = relationship(
        "Inventory", back_populates="business", cascade="all, delete-orphan"
    )
    sales: Mapped[List["Sale"]] = relationship(
        "Sale", back_populates="business", cascade="all, delete-orphan"
    )
    import_histories: Mapped[List["ImportHistory"]] = relationship(
        "ImportHistory", back_populates="business", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Business(id={self.__dict__.get('id')}, name='{self.__dict__.get('business_name')}')>"


class BusinessProfile(Base):
    """
    BusinessProfile table storing rich extracted attributes gathered during AI Discovery.
    """
    __tablename__ = "business_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    
    location_type: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    nearby_places: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    primary_customers: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    daily_customers: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    employees: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    supplier_count: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    seasonality: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    top_products: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    business_scale: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    opening_time: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    closing_time: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="profile")

    def __repr__(self) -> str:
        return f"<BusinessProfile(business_id={self.__dict__.get('business_id')})>"


class Supplier(Base):
    """
    Suppliers table for vendor details.
    """
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="suppliers")
    inventory_items: Mapped[List["Inventory"]] = relationship(
        "Inventory", back_populates="supplier"
    )

    def __repr__(self) -> str:
        return f"<Supplier(id={self.__dict__.get('id')}, name='{self.__dict__.get('name')}')>"


class Product(Base):
    """
    Products catalog table.
    """
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sku: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="General")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="products")
    inventory: Mapped[Optional["Inventory"]] = relationship(
        "Inventory", back_populates="product", uselist=False, cascade="all, delete-orphan"
    )
    sales: Mapped[List["Sale"]] = relationship(
        "Sale", back_populates="product", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Product(id={self.__dict__.get('id')}, sku='{self.__dict__.get('sku')}', name='{self.__dict__.get('name')}')>"


class Inventory(Base):
    """
    Inventory stock table tracking stock levels, prices, expiry dates, and dynamic stock status.
    """
    __tablename__ = "inventory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    supplier_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True, index=True
    )

    current_stock: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    minimum_stock: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    maximum_stock: Mapped[int] = mapped_column(Integer, default=100, nullable=False)

    buying_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    selling_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    expiry_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Healthy", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="inventory_items")
    product: Mapped["Product"] = relationship("Product", back_populates="inventory")
    supplier: Mapped[Optional["Supplier"]] = relationship("Supplier", back_populates="inventory_items")

    def __repr__(self) -> str:
        return f"<Inventory(product_id={self.__dict__.get('product_id')}, stock={self.__dict__.get('current_stock')}, status='{self.__dict__.get('status')}')>"


class Sale(Base):
    """
    Sales transaction table recording stock movement and revenue.
    """
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    buying_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, nullable=False)

    sale_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="sales")
    product: Mapped["Product"] = relationship("Product", back_populates="sales")

    def __repr__(self) -> str:
        return f"<Sale(id={self.__dict__.get('id')}, product_id={self.__dict__.get('product_id')}, amount={self.__dict__.get('total_amount')})>"


class ImportHistory(Base):
    """
    CSV Import Audit Trail table tracking upload pipeline operations.
    """
    __tablename__ = "import_histories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    rows_imported: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    rows_failed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g., Completed, Failed, Rolled back
    error_details: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)

    upload_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business", back_populates="import_histories")
    user: Mapped["User"] = relationship("User", back_populates="import_histories")

    def __repr__(self) -> str:
        return f"<ImportHistory(id={self.__dict__.get('id')}, filename='{self.__dict__.get('filename')}', status='{self.__dict__.get('status')}')>"


class ChatSession(Base):
    """
    Chat session log maintaining conversation context summaries per business.
    """
    __tablename__ = "chat_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    business_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, default="New Conversation")
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    # Relationships
    business: Mapped["Business"] = relationship("Business")
    user: Mapped["User"] = relationship("User")
    messages: Mapped[List["ChatMessage"]] = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at.asc()")

    def __repr__(self) -> str:
        return f"<ChatSession(session_id='{self.__dict__.get('session_id')}', business_id={self.__dict__.get('business_id')})>"


class ChatMessage(Base):
    """
    Individual message log within a chat session.
    """
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("chat_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True
    )

    role: Mapped[str] = mapped_column(String(32), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    intent: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )

    # Relationships
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.__dict__.get('id')}, role='{self.__dict__.get('role')}')>"
