from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import asyncpg
import os
import jwt
import bcrypt
from dotenv import load_dotenv
from contextlib import asynccontextmanager
from decimal import Decimal
import logging
load_dotenv()


JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60  
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 30  
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not JWT_SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY must be set in environment variables")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL must be set in environment variables")

db_pool: Optional[asyncpg.Pool] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection lifecycle"""
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=5, max_size=20)
    print("Database pool created")
    yield
    await db_pool.close()
    print("Database pool closed")

async def get_db():
    """Dependency to get database connection"""
    async with db_pool.acquire() as conn:
        yield conn

app = FastAPI(
    title="FinCore Payment System - JWT Auth",
    description="Production-grade payment system with JWT authentication",
    version="2.0.0",
    lifespan=lifespan
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

class UserRegister(BaseModel):
    """User registration"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    user_type: str = Field(default="individual")

class UserLogin(BaseModel):
    """User login"""
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str

class UserProfile(BaseModel):
    """User profile info"""
    user_id: str
    email: str
    phone: Optional[str]
    user_type: str
    status: str
    created_at: datetime


class PaymentRequest(BaseModel):
    """Request to create a payment"""
    idempotency_key: str = Field(..., min_length=1, max_length=255)
    from_account_number: str
    to_account_number: str
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PaymentResponse(BaseModel):
    """Payment response"""
    success: bool
    payment_intent_id: Optional[str]
    transaction_id: Optional[str]
    status: str
    error_code: Optional[str] = None
    error_message: Optional[str] = None

class RefundRequest(BaseModel):
    """Request to create a refund"""
    payment_intent_id: str
    refund_amount: Decimal = Field(..., gt=0)
    refund_type: str = Field(default="partial")
    reason: Optional[str] = None
    idempotency_key: str

class RefundResponse(BaseModel):
    """Refund response"""
    success: bool
    refund_id: Optional[str]
    refund_transaction_id: Optional[str]
    status: str
    error_code: Optional[str] = None
    error_message: Optional[str] = None

class MoneyHoldRequest(BaseModel):
    """Request to create money hold"""
    account_number: str
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="USD")
    hold_type: str = Field(default="payment_authorization")
    description: Optional[str] = None
    expires_in_seconds: int = Field(default=3600, ge=60, le=86400)

class MoneyHoldResponse(BaseModel):
    """Money hold response"""
    success: bool
    hold_id: Optional[str]
    error_code: Optional[str] = None
    error_message: Optional[str] = None

class CaptureHoldRequest(BaseModel):
    """Request to capture hold"""
    hold_id: str
    to_account_number: str
    description: Optional[str] = None

class AccountBalance(BaseModel):
    """Account balance information"""
    account_number: str
    account_type: str
    total_balance: Decimal
    held_amount: Decimal
    available_balance: Decimal
    currency: str
class TransferRequest(BaseModel):
    idempotency_key: str
    from_account_number: str
    to_account_number: str
    amount: float
    currency: str = "USD"
    description: str = ""
    metadata: dict = {}

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    })
    
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[dict]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        if payload.get("type") != token_type:
            return None
        
        return payload
    
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    conn: asyncpg.Connection = Depends(get_db)
) -> Dict:
    """
    Verify JWT token and return current user
    """
    token = credentials.credentials
    
    payload = verify_token(token, token_type="access")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = await conn.fetchrow("""
        SELECT id, email, phone, user_type, status, created_at
        FROM users
        WHERE id = $1 AND status = 'active'
    """, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return dict(user)


async def get_account_id_by_number(conn: asyncpg.Connection, account_number: str) -> Optional[str]:
    """Get account UUID by account number"""
    account_id = await conn.fetchval(
        "SELECT id FROM accounts WHERE account_number = $1",
        account_number
    )
    return str(account_id) if account_id else None


@app.post("/api/v1/auth/register", response_model=TokenResponse)
async def register_user(
    user: UserRegister,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Register a new user, create default account with $1000, create transaction and ledger entry.
    """
    try:
        async with conn.transaction():
            password_hash = hash_password(user.password)

            user_id = await conn.fetchval("""
                INSERT INTO users (email, phone, password_hash, user_type, status)
                VALUES ($1, $2, $3, $4, 'active')
                RETURNING id
            """, user.email, user.phone, password_hash, user.user_type)

            import random
            account_number = f"ACC{random.randint(100000, 999999)}"

            account_id = await conn.fetchval("""
                INSERT INTO accounts (
                    account_number,
                    user_id,
                    account_type,
                    balance,
                    currency,
                    status
                )
                VALUES ($1, $2, 'user', 0, 'USD', 'active')
                RETURNING id
            """, account_number, user_id)
            transaction_id = await conn.fetchval("""
                INSERT INTO transactions (
                    transaction_type,
                    status,
                    description,
                    completed_at
                )
                VALUES (
                    'deposit',
                    'completed',
                    'Initial account funding',
                    NOW()
                )
                RETURNING id
            """)
            initial_balance = 0
            deposit_amount = 1000.00
            balance_after = initial_balance + deposit_amount

            await conn.execute("""
                INSERT INTO ledger_entries (
                    transaction_id,
                    account_id,
                    entry_type,
                    amount,
                    balance_after,
                    description,
                    created_at
                )
                VALUES (
                    $1,
                    $2,
                    'credit',
                    $3,
                    $4,
                    'Initial account funding',
                    NOW()
                )
            """,
                transaction_id,
                account_id,
                deposit_amount,
                balance_after
            )

            await conn.execute("""
                UPDATE accounts
                SET balance = $1
                WHERE id = $2
            """, balance_after, account_id)

            print(f"✅ User registered: {user.email}")
            print(f"✅ Default account {account_number} funded with $1000")

        access_token = create_access_token(
            data={"sub": str(user_id), "email": user.email}
        )
        refresh_token = create_refresh_token(
            data={"sub": str(user_id)}
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Login and get JWT tokens
    """
    user = await conn.fetchrow("""
        SELECT id, email, password_hash, status
        FROM users
        WHERE email = $1
    """, credentials.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if user['status'] != 'active':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    
    if not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(data={"sub": str(user['id']), "email": user['email']})
    refresh_token = create_refresh_token(data={"sub": str(user['id'])})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@app.post("/api/v1/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_request: RefreshTokenRequest,
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Get new access token using refresh token
    """
    payload = verify_token(refresh_request.refresh_token, token_type="refresh")
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
    
    user_id = payload.get("sub")
    
    user = await conn.fetchrow("""
        SELECT email FROM users WHERE id = $1 AND status = 'active'
    """, user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    access_token = create_access_token(data={"sub": user_id, "email": user['email']})
    new_refresh_token = create_refresh_token(data={"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@app.get("/api/v1/auth/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user: Dict = Depends(get_current_user)
):
    """
    Get current user profile
    """
    return UserProfile(
        user_id=str(current_user['id']),
        email=current_user['email'],
        phone=current_user.get('phone'),
        user_type=current_user['user_type'],
        status=current_user['status'],
        created_at=current_user['created_at']
    )

@app.get("/api/v1/accounts/my-accounts")
async def get_my_accounts(
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Get all accounts of current user
    """
    accounts = await conn.fetch("""
        SELECT 
            account_number,
            account_type,
            balance as total_balance,
            COALESCE(
                (SELECT SUM(amount)  
                 FROM money_holds 
                 WHERE account_id = accounts.id 
                 AND status = 'active' 
                 AND expires_at > NOW()), 
                0
            ) as held_amount,
            balance - COALESCE(
                (SELECT SUM(amount) 
                 FROM money_holds 
                 WHERE account_id = accounts.id 
                 AND status = 'active' 
                 AND expires_at > NOW()), 
                0
            ) as available_balance,
            currency,
            status,
            created_at
        FROM accounts
        WHERE user_id = $1
        ORDER BY created_at DESC
    """, current_user['id'])
    
    return [dict(acc) for acc in accounts]

@app.post("/api/v1/accounts/create")
async def create_new_account(
    account_type: str = "user",  
    initial_balance: Decimal = 0.00,
    currency: str = "USD",
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new account for current user
    Allowed account_type: 'user', 'merchant', 'system', 'fee', 'reserve'
    """
    allowed_types = ['user', 'merchant', 'system', 'fee', 'reserve']
    if account_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid account_type. Allowed values: {', '.join(allowed_types)}"
        )
    
    try:
        import random
        account_number = f"ACC{random.randint(100000, 999999)}"
        
        account_id = await conn.fetchval("""
            INSERT INTO accounts (account_number, user_id, account_type, balance, currency, status)
            VALUES ($1, $2, $3, $4, $5, 'active')
            RETURNING id
        """, account_number, current_user['id'], account_type, initial_balance, currency)
        
        return {
            "success": True,
            "account_id": str(account_id),
            "account_number": account_number,
            "account_type": account_type,
            "balance": float(initial_balance),
            "currency": currency,
            "message": f"Account {account_number} created successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Account creation failed: {str(e)}"
        )

@app.get("/")
async def root():
    """API root"""
    return {
        "service": "FinCore Payment System",
        "version": "2.0.0",
        "auth": "JWT",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "register": "/api/v1/auth/register",
            "login": "/api/v1/auth/login",
            "payments": "/api/v1/payments",
            "refunds": "/api/v1/refunds",
            "holds": "/api/v1/holds",
            "accounts": "/api/v1/accounts"
        }
    }

@app.get("/health")
async def health_check(conn: asyncpg.Connection = Depends(get_db)):
    """Health check endpoint"""
    try:
        result = await conn.fetchval("SELECT 1")
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unhealthy: {str(e)}"
        )

@app.post("/api/v1/payments", response_model=PaymentResponse)
async def create_payment(
    payment: PaymentRequest,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """
    Create a new payment (JWT protected)
    """
    try:
        from_account_id = await get_account_id_by_number(conn, payment.from_account_number)
        to_account_id = await get_account_id_by_number(conn, payment.to_account_number)
        
        if not from_account_id or not to_account_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or both accounts not found"
            )
        
        result = await conn.fetchrow("""
            SELECT * FROM process_payment(
                $1, $2, $3, $4, $5, $6, $7, $8, NULL
            )
        """, 
            payment.idempotency_key,
            str(current_user['id']),
            from_account_id,
            to_account_id,
            payment.amount,
            payment.currency,
            payment.description,
            current_user['email']
        )
        
        return PaymentResponse(
            success=result['success'],
            payment_intent_id=str(result['payment_intent_id']) if result['payment_intent_id'] else None,
            transaction_id=str(result['transaction_id']) if result['transaction_id'] else None,
            status=result['status'],
            error_code=result['error_code'],
            error_message=result['error_message']
        )
        
    except asyncpg.PostgresError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@app.get("/api/v1/payments/{payment_intent_id}")
async def get_payment(
    payment_intent_id: str,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get payment status (JWT protected)"""
    result = await conn.fetchrow("""
        SELECT * FROM v_payment_status
        WHERE payment_intent_id = $1
    """, payment_intent_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return dict(result)


@app.post("/api/v1/refunds", response_model=RefundResponse)
async def create_refund(
    refund: RefundRequest,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Process a refund (JWT protected)"""
    try:
        result = await conn.fetchrow("""
            SELECT * FROM process_refund(
                $1, $2, $3, $4, $5, $6
            )
        """,
            refund.payment_intent_id,
            refund.refund_amount,
            refund.refund_type,
            refund.reason,
            refund.idempotency_key,
            current_user['email']
        )
        
        return RefundResponse(
            success=result['success'],
            refund_id=str(result['refund_id']) if result['refund_id'] else None,
            refund_transaction_id=str(result['refund_transaction_id']) if result['refund_transaction_id'] else None,
            status=result['status'],
            error_code=result['error_code'],
            error_message=result['error_message']
        )
        
    except asyncpg.PostgresError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.post("/api/v1/holds", response_model=MoneyHoldResponse)
async def create_hold(
    hold: MoneyHoldRequest,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Create a money hold (JWT protected)"""
    try:
        account_id = await get_account_id_by_number(conn, hold.account_number)
        if not account_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )
        
        result = await conn.fetchrow("""
            SELECT * FROM create_money_hold(
                $1, $2, $3, $4, $5, $6, NULL
            )
        """,
            account_id,
            hold.amount,
            hold.currency,
            hold.hold_type,
            hold.description,
            hold.expires_in_seconds
        )
        
        return MoneyHoldResponse(
            success=result['success'],
            hold_id=str(result['hold_id']) if result['hold_id'] else None,
            error_code=result['error_code'],
            error_message=result['error_message']
        )
        
    except asyncpg.PostgresError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

@app.post("/api/v1/holds/{hold_id}/capture")
async def capture_hold(
    hold_id: str,
    capture: CaptureHoldRequest,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Capture a hold (JWT protected)"""
    try:
        to_account_id = await get_account_id_by_number(conn, capture.to_account_number)
        if not to_account_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Destination account not found"
            )
        
        result = await conn.fetchrow("""
            SELECT * FROM capture_money_hold($1, $2, $3)
        """, hold_id, to_account_id, capture.description)
        
        return {
            "success": result['success'],
            "transaction_id": str(result['transaction_id']) if result['transaction_id'] else None,
            "error_code": result['error_code'],
            "error_message": result['error_message']
        }
        
    except asyncpg.PostgresError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.get("/api/v1/accounts/{account_number}/balance", response_model=AccountBalance)
async def get_account_balance(
    account_number: str,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get account balance (JWT protected)"""
    result = await conn.fetchrow("""
        SELECT * FROM v_account_balances_with_holds
        WHERE account_number = $1
    """, account_number)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    return AccountBalance(
        account_number=result['account_number'],
        account_type=result['account_type'],
        total_balance=result['total_balance'],
        held_amount=result['held_amount'],
        available_balance=result['available_balance'],
        currency=result['currency']
    )

@app.get("/api/v1/accounts/{account_number}/transactions")
async def get_account_transactions(
    account_number: str,
    limit: int = 50,
    offset: int = 0,
    conn: asyncpg.Connection = Depends(get_db),
    current_user: Dict = Depends(get_current_user)
):
    """Get account transaction history (JWT protected)"""
    account_id = await get_account_id_by_number(conn, account_number)
    if not account_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    transactions = await conn.fetch("""
        SELECT 
            t.id as transaction_id,
            t.transaction_type as type,
            t.status,
            fa.account_number as from_account,
            ta.account_number as to_account,
            t.amount,
            t.currency,
            t.description,
            t.created_at,
            t.completed_at
        FROM transactions t
        LEFT JOIN accounts fa ON t.from_account_id = fa.id
        LEFT JOIN accounts ta ON t.to_account_id = ta.id
        WHERE t.from_account_id = $1 OR t.to_account_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2 OFFSET $3
    """, account_id, limit, offset)
    
    return [dict(tx) for tx in transactions]

logging.basicConfig(level=logging.INFO)

@app.post("/api/v1/transfer")
async def transfer_funds(
    transfer: TransferRequest,
    conn: asyncpg.Connection = Depends(get_db)
):
    try:
        async with conn.transaction():

            existing_txn = await conn.fetchrow("""
                SELECT id FROM transactions
                WHERE idempotency_key = $1
            """, transfer.idempotency_key)

            if existing_txn:
                return {
                    "detail": "Transaction already processed",
                    "transaction_id": str(existing_txn["id"])
                }

            from_acc = await conn.fetchrow(
                "SELECT id, balance FROM accounts WHERE account_number = $1 FOR UPDATE",
                transfer.from_account_number
            )
            to_acc = await conn.fetchrow(
                "SELECT id, balance FROM accounts WHERE account_number = $1 FOR UPDATE",
                transfer.to_account_number
            )

            if not from_acc or not to_acc:
                raise HTTPException(status_code=404, detail="Account not found")

            amount = Decimal(str(transfer.amount))
            from_balance = Decimal(from_acc["balance"])
            to_balance = Decimal(to_acc["balance"])

            if from_balance < amount:
                raise HTTPException(status_code=400, detail="Insufficient funds")

            logging.info(f"Transfer amount: {amount}, From balance: {from_balance}, To balance: {to_balance}")

            txn_id = await conn.fetchval("""
                INSERT INTO transactions (transaction_type, status, description, idempotency_key, completed_at)
                VALUES ('transfer', 'completed', $1, $2, NOW())
                RETURNING id
            """, transfer.description, transfer.idempotency_key)

            balance_after_from = from_balance - amount
            balance_after_to   = to_balance + amount
            await conn.execute("""
                INSERT INTO ledger_entries (
                    transaction_id, account_id, entry_type, amount, balance_after, description, created_at
                ) VALUES ($1, $2, 'debit', $3, $4, $5, NOW())
            """, txn_id, from_acc["id"], -amount, balance_after_from, transfer.description)

            await conn.execute("""
                INSERT INTO ledger_entries (
                    transaction_id, account_id, entry_type, amount, balance_after, description, created_at
                ) VALUES ($1, $2, 'credit', $3, $4, $5, NOW())
            """, txn_id, to_acc["id"], amount, balance_after_to, transfer.description)

            await conn.execute(
                "UPDATE accounts SET balance = $1 WHERE id = $2",
                balance_after_from, from_acc["id"]
            )
            await conn.execute(
                "UPDATE accounts SET balance = $1 WHERE id = $2",
                balance_after_to, to_acc["id"]
            )

            logging.info(f" Transfer completed: {txn_id}")
            return {"detail": "Transfer completed", "transaction_id": str(txn_id)}

    except Exception as e:
        logging.error(f" Transfer failed: {e}")
        raise HTTPException(status_code=500, detail=f"Transfer failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )