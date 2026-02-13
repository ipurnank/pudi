from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'expense_tracker')]

# Create the main app
app = FastAPI(title="Expense Tracker API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class TransactionType(str, Enum):
    EXPENSE = "expense"
    INCOME = "income"

# Models
class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    color: str = "#6366F1"  # Default indigo
    icon: str = "💰"  # Default emoji
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CategoryCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366F1"
    icon: Optional[str] = "💰"

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    amount: float
    category_id: str
    category_name: str = ""
    type: TransactionType
    date: datetime
    note: Optional[str] = ""
    is_recurring: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    amount: float
    category_id: str
    category_name: Optional[str] = ""
    type: TransactionType
    date: datetime
    note: Optional[str] = ""
    is_recurring: bool = False

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    type: Optional[TransactionType] = None
    date: Optional[datetime] = None
    note: Optional[str] = None
    is_recurring: Optional[bool] = None

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: Optional[str] = ""
    date: datetime
    time: str  # HH:MM format
    is_recurring: bool = False
    is_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReminderCreate(BaseModel):
    title: str
    message: Optional[str] = ""
    date: datetime
    time: str
    is_recurring: bool = False
    is_enabled: bool = True

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    date: Optional[datetime] = None
    time: Optional[str] = None
    is_recurring: Optional[bool] = None
    is_enabled: Optional[bool] = None

# Default categories
DEFAULT_CATEGORIES = [
    {"name": "Food", "color": "#EF4444", "icon": "🍔"},
    {"name": "Rent", "color": "#8B5CF6", "icon": "🏠"},
    {"name": "Transport", "color": "#3B82F6", "icon": "🚗"},
    {"name": "Shopping", "color": "#EC4899", "icon": "🛍️"},
    {"name": "Bills", "color": "#F59E0B", "icon": "📄"},
    {"name": "Entertainment", "color": "#10B981", "icon": "🎬"},
    {"name": "Salary", "color": "#22C55E", "icon": "💵"},
    {"name": "Investments", "color": "#6366F1", "icon": "📈"},
]

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Expense Tracker API", "version": "1.0.0"}

# Category endpoints
@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find().to_list(100)
    if not categories:
        # Initialize default categories
        for cat in DEFAULT_CATEGORIES:
            category = Category(**cat)
            await db.categories.insert_one(category.dict())
        categories = await db.categories.find().to_list(100)
    return [Category(**cat) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    cat_obj = Category(**category.dict())
    await db.categories.insert_one(cat_obj.dict())
    return cat_obj

@api_router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category: CategoryUpdate):
    update_data = {k: v for k, v in category.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.categories.update_one(
        {"id": category_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = await db.categories.find_one({"id": category_id})
    return Category(**updated)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Transaction endpoints
@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    type: Optional[TransactionType] = None,
    category_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    query = {}
    if type:
        query["type"] = type
    if category_id:
        query["category_id"] = category_id
    if start_date:
        query["date"] = query.get("date", {})
        query["date"]["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if end_date:
        query["date"] = query.get("date", {})
        query["date"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(1000)
    return [Transaction(**t) for t in transactions]

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    trans_obj = Transaction(**transaction.dict())
    await db.transactions.insert_one(trans_obj.dict())
    return trans_obj

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, transaction: TransactionUpdate):
    update_data = {k: v for k, v in transaction.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    updated = await db.transactions.find_one({"id": transaction_id})
    return Transaction(**updated)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted successfully"}

# Analytics endpoints
@api_router.get("/analytics/monthly")
async def get_monthly_analytics(year: int, month: int):
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    transactions = await db.transactions.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    net_balance = total_income - total_expense
    savings_percentage = (net_balance / total_income * 100) if total_income > 0 else 0
    
    # Category breakdown for expenses
    category_breakdown = {}
    for t in transactions:
        if t["type"] == "expense":
            cat_name = t.get("category_name", "Other")
            category_breakdown[cat_name] = category_breakdown.get(cat_name, 0) + t["amount"]
    
    return {
        "year": year,
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": net_balance,
        "savings_percentage": round(savings_percentage, 1),
        "category_breakdown": category_breakdown,
        "transaction_count": len(transactions)
    }

@api_router.get("/analytics/last-six-months")
async def get_last_six_months():
    now = datetime.utcnow()
    months_data = []
    
    for i in range(5, -1, -1):
        month = now.month - i
        year = now.year
        while month <= 0:
            month += 12
            year -= 1
        
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        transactions = await db.transactions.find({
            "date": {"$gte": start_date, "$lt": end_date}
        }).to_list(1000)
        
        total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
        total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
        
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        months_data.append({
            "month": month_names[month - 1],
            "year": year,
            "income": total_income,
            "expense": total_expense
        })
    
    return months_data

# Reminder endpoints
@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders():
    reminders = await db.reminders.find().sort("date", 1).to_list(100)
    return [Reminder(**r) for r in reminders]

@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(reminder: ReminderCreate):
    rem_obj = Reminder(**reminder.dict())
    await db.reminders.insert_one(rem_obj.dict())
    return rem_obj

@api_router.put("/reminders/{reminder_id}", response_model=Reminder)
async def update_reminder(reminder_id: str, reminder: ReminderUpdate):
    update_data = {k: v for k, v in reminder.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.reminders.update_one(
        {"id": reminder_id},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    updated = await db.reminders.find_one({"id": reminder_id})
    return Reminder(**updated)

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str):
    result = await db.reminders.delete_one({"id": reminder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted successfully"}

# Export endpoint
@api_router.get("/export/csv")
async def export_csv(start_date: Optional[str] = None, end_date: Optional[str] = None):
    query = {}
    if start_date:
        query["date"] = query.get("date", {})
        query["date"]["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    if end_date:
        query["date"] = query.get("date", {})
        query["date"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(10000)
    
    csv_rows = ["Date,Type,Category,Amount,Notes"]
    for t in transactions:
        date_str = t["date"].strftime("%Y-%m-%d") if isinstance(t["date"], datetime) else str(t["date"])[:10]
        note = t.get("note", "").replace('"', '""').replace(',', ' ')
        csv_rows.append(f'{date_str},{t["type"]},{t.get("category_name", "Other")},{t["amount"]},"{note}"')
    
    return {"csv_content": "\n".join(csv_rows), "filename": f"expense_report_{datetime.utcnow().strftime('%Y%m%d')}.csv"}

# Reset data endpoint
@api_router.delete("/reset-all")
async def reset_all_data():
    await db.transactions.delete_many({})
    await db.categories.delete_many({})
    await db.reminders.delete_many({})
    return {"message": "All data has been reset"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
