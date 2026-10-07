from fastapi import FastAPI, HTTPException, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from pydantic import BaseModel, EmailStr, Field

from pwdlib import PasswordHash
from dotenv import load_dotenv

from datetime import datetime, timedelta, timezone

import sqlite3
import secrets
import os

import psycopg
from psycopg.rows import dict_row


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()


ADMIN_USERNAME = os.getenv(
    "PERRYHUB_ADMIN_USERNAME"
)

ADMIN_PASSWORD = os.getenv(
    "PERRYHUB_ADMIN_PASSWORD"
)

SECRET_KEY = os.getenv(
    "PERRYHUB_SECRET_KEY"
)

DATABASE_URL = os.getenv(
    "DATABASE_URL"
)

DATABASE = os.getenv(
    "PERRYHUB_DATABASE",
    "perryhub.db"
)

FRONTEND_URL = os.getenv(
    "PERRYHUB_FRONTEND_URL"
)

COOKIE_SECURE = os.getenv(
    "PERRYHUB_COOKIE_SECURE",
    "false"
).lower() == "true"

COOKIE_SAMESITE = os.getenv(
    "PERRYHUB_COOKIE_SAMESITE",
    "lax"
).lower()


# =========================================================
# ENVIRONMENT VALIDATION
# =========================================================

if not ADMIN_USERNAME:

    raise RuntimeError(
        "PERRYHUB_ADMIN_USERNAME is missing from .env"
    )


if not ADMIN_PASSWORD:

    raise RuntimeError(
        "PERRYHUB_ADMIN_PASSWORD is missing from .env"
    )


if not SECRET_KEY:

    raise RuntimeError(
        "PERRYHUB_SECRET_KEY is missing from .env"
    )


if COOKIE_SAMESITE not in {
    "lax",
    "strict",
    "none"
}:

    raise RuntimeError(
        "PERRYHUB_COOKIE_SAMESITE must be "
        "'lax', 'strict', or 'none'."
    )


if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:

    raise RuntimeError(
        "PERRYHUB_COOKIE_SAMESITE='none' requires "
        "PERRYHUB_COOKIE_SECURE='true'."
    )


# =========================================================
# DATABASE MODE
# =========================================================

USING_POSTGRESQL = bool(
    DATABASE_URL
)


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="PerryHub API",
    description="Secure backend API for PerryHub",
    version="2.3.0"
)


# =========================================================
# RATE LIMITING
# =========================================================

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[]
)


app.state.limiter = limiter


app.add_exception_handler(
    RateLimitExceeded,
    _rate_limit_exceeded_handler
)


# =========================================================
# CORS
# =========================================================

cors_origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]


if FRONTEND_URL:

    FRONTEND_URL = FRONTEND_URL.rstrip("/")

    if FRONTEND_URL not in cors_origins:

        cors_origins.append(
            FRONTEND_URL
        )


app.add_middleware(
    CORSMiddleware,

    allow_origins=cors_origins,

    allow_credentials=True,

    allow_methods=[
        "GET",
        "POST",
        "OPTIONS"
    ],

    allow_headers=[
        "Content-Type"
    ]
)


# =========================================================
# SECURITY HEADERS
# =========================================================

@app.middleware("http")
async def add_security_headers(
    request: Request,
    call_next
):

    response = await call_next(request)


    # -----------------------------------------------------
    # Prevent MIME-type sniffing
    # -----------------------------------------------------

    response.headers[
        "X-Content-Type-Options"
    ] = "nosniff"


    # -----------------------------------------------------
    # Prevent clickjacking
    # -----------------------------------------------------

    response.headers[
        "X-Frame-Options"
    ] = "DENY"


    # -----------------------------------------------------
    # Control referrer information
    # -----------------------------------------------------

    response.headers[
        "Referrer-Policy"
    ] = "strict-origin-when-cross-origin"


    # -----------------------------------------------------
    # Disable unnecessary browser permissions
    # -----------------------------------------------------

    response.headers[
        "Permissions-Policy"
    ] = (
        "camera=(), "
        "microphone=(), "
        "geolocation=()"
    )


    return response


# =========================================================
# PASSWORD HASHING
# =========================================================

password_hash = PasswordHash.recommended()


ADMIN_PASSWORD_HASH = password_hash.hash(
    ADMIN_PASSWORD
)


# =========================================================
# DATABASE HELPERS
# =========================================================

def get_database():

    # -----------------------------------------------------
    # Production: PostgreSQL / Supabase
    # -----------------------------------------------------

    if USING_POSTGRESQL:

        return psycopg.connect(
            DATABASE_URL,
            row_factory=dict_row
        )


    # -----------------------------------------------------
    # Local development: SQLite
    # -----------------------------------------------------

    connection = sqlite3.connect(
        DATABASE
    )

    connection.row_factory = sqlite3.Row

    return connection


def execute_query(
    cursor,
    query,
    params=()
):
    """
    Execute a parameterized query using syntax compatible
    with both SQLite and PostgreSQL.

    SQLite uses:
        ?

    PostgreSQL uses:
        %s
    """

    if USING_POSTGRESQL:

        query = query.replace(
            "?",
            "%s"
        )


    if params:

        return cursor.execute(
            query,
            params
        )


    return cursor.execute(
        query
    )


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def initialize_database():

    connection = get_database()

    cursor = connection.cursor()


    # =====================================================
    # POSTGRESQL
    # =====================================================

    if USING_POSTGRESQL:

        # -------------------------------------------------
        # Messages
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (

                id SERIAL PRIMARY KEY,

                name TEXT NOT NULL,

                email TEXT NOT NULL,

                subject TEXT NOT NULL,

                message TEXT NOT NULL,

                created_at TEXT NOT NULL

            )
            """
        )


        # -------------------------------------------------
        # Audit logs
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (

                id SERIAL PRIMARY KEY,

                event TEXT NOT NULL,

                details TEXT,

                created_at TEXT NOT NULL

            )
            """
        )


        # -------------------------------------------------
        # Admin sessions
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_sessions (

                id SERIAL PRIMARY KEY,

                session_id TEXT NOT NULL UNIQUE,

                expires_at TEXT NOT NULL,

                created_at TEXT NOT NULL

            )
            """
        )


    # =====================================================
    # SQLITE
    # =====================================================

    else:

        # -------------------------------------------------
        # Messages
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                name TEXT NOT NULL,

                email TEXT NOT NULL,

                subject TEXT NOT NULL,

                message TEXT NOT NULL,

                created_at TEXT NOT NULL

            )
            """
        )


        # -------------------------------------------------
        # Audit logs
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_logs (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                event TEXT NOT NULL,

                details TEXT,

                created_at TEXT NOT NULL

            )
            """
        )


        # -------------------------------------------------
        # Admin sessions
        # -------------------------------------------------

        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS admin_sessions (

                id INTEGER PRIMARY KEY AUTOINCREMENT,

                session_id TEXT NOT NULL UNIQUE,

                expires_at TEXT NOT NULL,

                created_at TEXT NOT NULL

            )
            """
        )


    connection.commit()

    connection.close()


initialize_database()


# =========================================================
# SESSION SETTINGS
# =========================================================

SESSION_DURATION = timedelta(
    hours=2
)


# =========================================================
# SESSION CLEANUP
# =========================================================

def cleanup_expired_sessions():

    connection = get_database()

    cursor = connection.cursor()


    now = datetime.now(
        timezone.utc
    ).isoformat()


    execute_query(
        cursor,

        """
        DELETE FROM admin_sessions

        WHERE expires_at <= ?
        """,

        (
            now,
        )
    )


    deleted_count = cursor.rowcount


    connection.commit()

    connection.close()


    return deleted_count


# =========================================================
# SESSION CREATION
# =========================================================

def create_session():

    cleanup_expired_sessions()


    session_id = secrets.token_urlsafe(
        48
    )


    now = datetime.now(
        timezone.utc
    )


    expires_at = (
        now +
        SESSION_DURATION
    )


    connection = get_database()

    cursor = connection.cursor()


    execute_query(
        cursor,

        """
        INSERT INTO admin_sessions
        (
            session_id,
            expires_at,
            created_at
        )

        VALUES (?, ?, ?)
        """,

        (
            session_id,
            expires_at.isoformat(),
            now.isoformat()
        )
    )


    connection.commit()

    connection.close()


    return session_id


# =========================================================
# SESSION LOOKUP
# =========================================================

def get_session(
    request: Request
):

    session_id = request.cookies.get(
        "perryhub_admin_session"
    )


    if not session_id:

        return None


    connection = get_database()

    cursor = connection.cursor()


    execute_query(
        cursor,

        """
        SELECT
            session_id,
            expires_at,
            created_at

        FROM admin_sessions

        WHERE session_id = ?
        """,

        (
            session_id,
        )
    )


    session = cursor.fetchone()


    if not session:

        connection.close()

        return None


    expires_at = datetime.fromisoformat(
        session["expires_at"]
    )


    now = datetime.now(
        timezone.utc
    )


    if now >= expires_at:

        execute_query(
            cursor,

            """
            DELETE FROM admin_sessions

            WHERE session_id = ?
            """,

            (
                session_id,
            )
        )


        connection.commit()

        connection.close()

        return None


    connection.close()


    return {

        "session_id":
            session["session_id"],

        "expires_at":
            expires_at,

        "created_at":
            session["created_at"]

    }


# =========================================================
# ADMIN AUTHENTICATION
# =========================================================

def require_admin(
    request: Request
):

    session = get_session(
        request
    )


    if not session:

        raise HTTPException(
            status_code=401,
            detail="Administrator authentication required."
        )


    return session


# =========================================================
# AUDIT LOGGING
# =========================================================

def create_audit_log(
    event,
    details=""
):

    connection = get_database()

    cursor = connection.cursor()


    execute_query(
        cursor,

        """
        INSERT INTO audit_logs
        (
            event,
            details,
            created_at
        )

        VALUES (?, ?, ?)
        """,

        (
            event,
            details,
            datetime.now(
                timezone.utc
            ).isoformat()
        )
    )


    connection.commit()

    connection.close()


# =========================================================
# MODELS
# =========================================================

class ContactMessage(BaseModel):

    name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    subject: str = Field(
        min_length=2,
        max_length=200
    )

    message: str = Field(
        min_length=10,
        max_length=5000
    )


class AdminLogin(BaseModel):

    username: str

    password: str


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {

        "name":
            "PerryHub API",

        "status":
            "online",

        "version":
            "2.3.0"

    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
def health():

    return {

        "status":
            "healthy",

        "service":
            "PerryHub API",

        "database":
            "postgresql"
            if USING_POSTGRESQL
            else "sqlite",

        "timestamp":
            datetime.now(
                timezone.utc
            ).isoformat()

    }


# =========================================================
# ADMIN LOGIN
# RATE LIMITED
# =========================================================

@app.post("/api/admin/login")
@limiter.limit("5/minute")
def admin_login(
    request: Request,
    login: AdminLogin,
    response: Response
):

    # -----------------------------------------------------
    # Username verification
    # -----------------------------------------------------

    if not secrets.compare_digest(
        login.username,
        ADMIN_USERNAME
    ):

        create_audit_log(
            "LOGIN_FAILED",
            "Invalid administrator username."
        )


        raise HTTPException(
            status_code=401,
            detail="Invalid username or password."
        )


    # -----------------------------------------------------
    # Password verification
    # -----------------------------------------------------

    if not password_hash.verify(
        login.password,
        ADMIN_PASSWORD_HASH
    ):

        create_audit_log(
            "LOGIN_FAILED",
            "Invalid administrator password."
        )


        raise HTTPException(
            status_code=401,
            detail="Invalid username or password."
        )


    # -----------------------------------------------------
    # Create session
    # -----------------------------------------------------

    session_id = create_session()


    # -----------------------------------------------------
    # Authentication cookie
    # -----------------------------------------------------

    response.set_cookie(

        key="perryhub_admin_session",

        value=session_id,

        httponly=True,

        secure=COOKIE_SECURE,

        samesite=COOKIE_SAMESITE,

        max_age=int(
            SESSION_DURATION.total_seconds()
        ),

        path="/"

    )


    # -----------------------------------------------------
    # Audit log
    # -----------------------------------------------------

    create_audit_log(
        "LOGIN_SUCCESS",
        "Administrator authenticated successfully."
    )


    return {

        "success":
            True,

        "message":
            "Administrator login successful."

    }


# =========================================================
# CURRENT ADMIN SESSION
# =========================================================

@app.get("/api/admin/me")
def admin_me(
    request: Request,
    session=Depends(require_admin)
):

    return {

        "authenticated":
            True,

        "expires_at":
            session[
                "expires_at"
            ].isoformat()

    }


# =========================================================
# ADMIN SECURITY STATUS
# =========================================================

@app.get("/api/admin/security-status")
def admin_security_status(
    request: Request,
    session=Depends(require_admin)
):

    return {

        "success":
            True,

        "security": {

            "authentication": {

                "enabled":
                    True,

                "status":
                    "Protected"

            },

            "rate_limiting": {

                "enabled":
                    True,

                "status":
                    "Protected"

            },

            "cors": {

                "enabled":
                    True,

                "status":
                    "Configured"

            },

            "security_headers": {

                "enabled":
                    True,

                "status":
                    "Protected"

            },

            "session_security": {

                "enabled":
                    True,

                "status":
                    "Protected"

            }

        }

    }


# =========================================================
# ADMIN LOGOUT
# =========================================================

@app.post("/api/admin/logout")
def admin_logout(
    request: Request,
    response: Response
):

    session_id = request.cookies.get(
        "perryhub_admin_session"
    )


    if session_id:

        connection = get_database()

        cursor = connection.cursor()


        execute_query(
            cursor,

            """
            DELETE FROM admin_sessions

            WHERE session_id = ?
            """,

            (
                session_id,
            )
        )


        connection.commit()

        connection.close()


    response.delete_cookie(

        key="perryhub_admin_session",

        path="/"

    )


    create_audit_log(
        "LOGOUT",
        "Administrator session ended."
    )


    return {

        "success":
            True,

        "message":
            "Administrator logged out."

    }


# =========================================================
# LOGOUT ALL ADMIN SESSIONS
# PROTECTED
# =========================================================

@app.post("/api/admin/logout-all")
def logout_all_sessions(
    request: Request,
    response: Response,
    session=Depends(require_admin)
):

    connection = get_database()

    cursor = connection.cursor()


    cursor.execute(
        """
        DELETE FROM admin_sessions
        """
    )


    deleted_count = cursor.rowcount


    connection.commit()

    connection.close()


    response.delete_cookie(

        key="perryhub_admin_session",

        path="/"

    )


    create_audit_log(
        "LOGOUT_ALL_SESSIONS",
        (
            "All administrator sessions invalidated. "
            f"Sessions removed: {deleted_count}"
        )
    )


    return {

        "success":
            True,

        "message":
            "All administrator sessions have been invalidated.",

        "sessions_removed":
            deleted_count

    }


# =========================================================
# ABOUT
# =========================================================

@app.get("/api/about")
def about():

    return {

        "name":
            "Perry Lawson Susuali",

        "platform":
            "PerryHub",

        "focus": [

            "Cybersecurity",

            "Digital Forensics",

            "Artificial Intelligence",

            "Software Development",

            "Technology Research"

        ]

    }


# =========================================================
# PROJECTS
# =========================================================

@app.get("/api/projects")
def projects():

    return {

        "projects":
            []

    }


# =========================================================
# RESEARCH
# =========================================================

@app.get("/api/research")
def research():

    return {

        "research":
            []

    }


# =========================================================
# CONTACT
# RATE LIMITED
# =========================================================

@app.post("/api/contact")
@limiter.limit("5/minute")
def contact(
    request: Request,
    message: ContactMessage
):

    # -----------------------------------------------------
    # Clean input
    # -----------------------------------------------------

    name = message.name.strip()

    email = str(
        message.email
    ).strip()

    subject = message.subject.strip()

    message_text = message.message.strip()


    # -----------------------------------------------------
    # Extra validation
    # -----------------------------------------------------

    if len(name) < 2:

        raise HTTPException(
            status_code=422,
            detail="Name must contain at least 2 characters."
        )


    if len(subject) < 2:

        raise HTTPException(
            status_code=422,
            detail="Subject must contain at least 2 characters."
        )


    if len(message_text) < 10:

        raise HTTPException(
            status_code=422,
            detail="Message must contain at least 10 characters."
        )


    # -----------------------------------------------------
    # Save message
    # -----------------------------------------------------

    connection = get_database()

    cursor = connection.cursor()


    created_at = datetime.now(
        timezone.utc
    ).isoformat()


    if USING_POSTGRESQL:

        cursor.execute(
            """
            INSERT INTO messages
            (
                name,
                email,
                subject,
                message,
                created_at
            )

            VALUES (%s, %s, %s, %s, %s)

            RETURNING id
            """,

            (
                name,
                email,
                subject,
                message_text,
                created_at
            )
        )

        inserted_row = cursor.fetchone()

        message_id = inserted_row["id"]


    else:

        cursor.execute(
            """
            INSERT INTO messages
            (
                name,
                email,
                subject,
                message,
                created_at
            )

            VALUES (?, ?, ?, ?, ?)

            RETURNING id
            """,

            (
                name,
                email,
                subject,
                message_text,
                created_at
            )
        )

        inserted_row = cursor.fetchone()

        message_id = inserted_row["id"]


    connection.commit()

    connection.close()


    # -----------------------------------------------------
    # Audit log
    # -----------------------------------------------------

    create_audit_log(
        "CONTACT_MESSAGE",
        (
            "New contact message received. "
            f"Message ID: {message_id}"
        )
    )


    return {

        "success":
            True,

        "message":
            "Your message has been received.",

        "data": {

            "id":
                message_id,

            "name":
                name,

            "email":
                email,

            "subject":
                subject,

            "created_at":
                created_at

        }

    }


# =========================================================
# GET CONTACT MESSAGES
# PROTECTED
# =========================================================

@app.get("/api/messages")
def get_messages(
    request: Request,
    session=Depends(require_admin)
):

    connection = get_database()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT
            id,
            name,
            email,
            subject,
            message,
            created_at

        FROM messages

        ORDER BY id DESC
        """
    )


    messages = cursor.fetchall()


    connection.close()


    return {

        "success":
            True,

        "count":
            len(messages),

        "messages": [

            dict(message)

            for message in messages

        ]

    }


# =========================================================
# ADMIN AUDIT LOGS
# PROTECTED
# =========================================================

@app.get("/api/admin/logs")
def get_admin_logs(
    request: Request,
    session=Depends(require_admin)
):

    connection = get_database()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT
            id,
            event,
            details,
            created_at

        FROM audit_logs

        ORDER BY id DESC

        LIMIT 100
        """
    )


    logs = cursor.fetchall()


    connection.close()


    return {

        "success":
            True,

        "count":
            len(logs),

        "logs": [

            dict(log)

            for log in logs

        ]

    }


# =========================================================
# ADMIN SESSION MANAGEMENT
# PROTECTED
# =========================================================

@app.get("/api/admin/sessions")
def get_admin_sessions(
    request: Request,
    session=Depends(require_admin)
):

    cleanup_expired_sessions()


    connection = get_database()

    cursor = connection.cursor()


    cursor.execute(
        """
        SELECT
            id,
            created_at,
            expires_at

        FROM admin_sessions

        ORDER BY id DESC
        """
    )


    sessions = cursor.fetchall()


    connection.close()


    return {

        "success":
            True,

        "count":
            len(sessions),

        "sessions": [

            dict(item)

            for item in sessions

        ]

    }