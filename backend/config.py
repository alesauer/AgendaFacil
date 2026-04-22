import os

class Config:
    APP_ENV = "development"
    SECRET_KEY = "change-this-secret"
    JWT_EXPIRES_MINUTES = 720

    DATABASE_URL = ""
    SUPABASE_URL = ""
    SUPABASE_KEY = ""
    SUPABASE_ONLY = True
    SUPABASE_NETWORK_MODE = "proxy"
    BYPASS_PROXY_FOR_SUPABASE = False
    DISABLE_SYSTEM_PROXY_FOR_SUPABASE = False
    SUPABASE_HTTP_TIMEOUT_SECONDS = 8
    SUPABASE_TENANT_RETRIES = 3

    EVOLUTION_API_BASE_URL = "https://http://gac.almg.uucp:8082/"
    EVOLUTION_API_KEY = ""
    EVOLUTION_API_KEY_HEADER = "apikey"
    EVOLUTION_INSTANCE = "chipGac"
    EVOLUTION_SEND_TEXT_PATH = "/message/sendText/{instance}"
    EVOLUTION_HTTP_TIMEOUT_SECONDS = 10

    RESEND_API_BASE_URL = "https://api.resend.com"
    RESEND_API_KEY = ""
    RESEND_HTTP_TIMEOUT_SECONDS = 10
    EMAIL_FROM_ADDRESS = "alesauer@gmail.com"
    EMAIL_FROM_NAME = "AgendaFácil"

    DEFAULT_BARBEARIA_SLUG = ""
    FRONTEND_APP_URL = ""
    MASTER_LOGIN = "master"
    MASTER_PASSWORD = ""
    MASTER_NAME = "Master SaaS"
    MP_ACCESS_TOKEN = ""
    MP_ACCESS_TOKEN_TEST = ""
    MP_WEBHOOK_SECRET = ""
    MP_PLAN_ID_MONTHLY = ""
    MP_PLAN_ID_YEARLY = ""
    MP_WEBHOOK_BARBEARIA_SLUG = ""
    SUSPENSION_WHATSAPP_URL = ""
    SUSPENSION_PORTAL_URL = ""
    SUSPENSION_BILLING_EMAIL = ""
    MASTER_CONFIG_ENCRYPTION_KEY = ""
    MASTER_RUNTIME_CONFIG_CACHE_SECONDS = 30


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


def _hydrate_from_env(config_cls):
    config_cls.APP_ENV = os.getenv("APP_ENV", "development")
    config_cls.SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
    config_cls.JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "720"))

    config_cls.DATABASE_URL = ""
    config_cls.SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    config_cls.SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
    config_cls.SUPABASE_ONLY = True
    config_cls.SUPABASE_NETWORK_MODE = os.getenv("SUPABASE_NETWORK_MODE", "auto").strip().lower()
    if config_cls.SUPABASE_NETWORK_MODE not in {"auto", "proxy", "direct"}:
        config_cls.SUPABASE_NETWORK_MODE = "auto"
    config_cls.BYPASS_PROXY_FOR_SUPABASE = os.getenv("BYPASS_PROXY_FOR_SUPABASE", "false").lower() == "true"
    config_cls.DISABLE_SYSTEM_PROXY_FOR_SUPABASE = os.getenv("DISABLE_SYSTEM_PROXY_FOR_SUPABASE", "false").lower() == "true"
    config_cls.SUPABASE_HTTP_TIMEOUT_SECONDS = int(os.getenv("SUPABASE_HTTP_TIMEOUT_SECONDS", "8"))
    config_cls.SUPABASE_TENANT_RETRIES = int(os.getenv("SUPABASE_TENANT_RETRIES", "3"))
    config_cls.EVOLUTION_API_BASE_URL = os.getenv("EVOLUTION_API_BASE_URL", "")
    config_cls.EVOLUTION_API_KEY = os.getenv("EVOLUTION_API_KEY", "")
    config_cls.EVOLUTION_API_KEY_HEADER = os.getenv("EVOLUTION_API_KEY_HEADER", "apikey")
    config_cls.EVOLUTION_INSTANCE = os.getenv("EVOLUTION_INSTANCE", "")
    config_cls.EVOLUTION_SEND_TEXT_PATH = os.getenv("EVOLUTION_SEND_TEXT_PATH", "/message/sendText/{instance}")
    config_cls.EVOLUTION_HTTP_TIMEOUT_SECONDS = int(os.getenv("EVOLUTION_HTTP_TIMEOUT_SECONDS", "10"))
    config_cls.RESEND_API_BASE_URL = os.getenv("RESEND_API_BASE_URL", "https://api.resend.com")
    config_cls.RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
    config_cls.RESEND_HTTP_TIMEOUT_SECONDS = int(os.getenv("RESEND_HTTP_TIMEOUT_SECONDS", "10"))
    config_cls.EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", "")
    config_cls.EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "AgendaFácil")
    config_cls.DEFAULT_BARBEARIA_SLUG = os.getenv("DEFAULT_BARBEARIA_SLUG", "")
    config_cls.FRONTEND_APP_URL = os.getenv("FRONTEND_APP_URL", "").strip()
    config_cls.MASTER_LOGIN = os.getenv("MASTER_LOGIN", "master")
    config_cls.MASTER_PASSWORD = os.getenv("MASTER_PASSWORD", "admin123")
    config_cls.MASTER_NAME = os.getenv("MASTER_NAME", "Master SaaS")
    config_cls.MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "").strip()
    config_cls.MP_ACCESS_TOKEN_TEST = os.getenv("MP_ACCESS_TOKEN_TEST", "").strip()
    config_cls.MP_WEBHOOK_SECRET = os.getenv("MP_WEBHOOK_SECRET", "").strip()
    config_cls.MP_PLAN_ID_MONTHLY = os.getenv("MP_PLAN_ID_MONTHLY", "").strip()
    config_cls.MP_PLAN_ID_YEARLY = os.getenv("MP_PLAN_ID_YEARLY", "").strip()
    config_cls.MP_WEBHOOK_BARBEARIA_SLUG = os.getenv("MP_WEBHOOK_BARBEARIA_SLUG", "").strip()
    config_cls.SUSPENSION_WHATSAPP_URL = os.getenv("SUSPENSION_WHATSAPP_URL", "").strip()
    config_cls.SUSPENSION_PORTAL_URL = os.getenv("SUSPENSION_PORTAL_URL", "").strip()
    config_cls.SUSPENSION_BILLING_EMAIL = os.getenv("SUSPENSION_BILLING_EMAIL", "").strip()
    config_cls.MASTER_CONFIG_ENCRYPTION_KEY = os.getenv("MASTER_CONFIG_ENCRYPTION_KEY", "").strip()
    config_cls.MASTER_RUNTIME_CONFIG_CACHE_SECONDS = int(os.getenv("MASTER_RUNTIME_CONFIG_CACHE_SECONDS", "30"))
    return config_cls


def get_config():
    env = os.getenv("APP_ENV", "development").lower()
    if env == "production":
        return _hydrate_from_env(ProductionConfig)
    return _hydrate_from_env(DevelopmentConfig)
