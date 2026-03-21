import os

class Config:
    APP_ENV = "development"
    SECRET_KEY = "change-this-secret"
    JWT_EXPIRES_MINUTES = 720

    DATABASE_URL = ""
    SUPABASE_URL = ""
    SUPABASE_KEY = ""
    SUPABASE_ONLY = True
    SUPABASE_NETWORK_MODE = "auto"
    BYPASS_PROXY_FOR_SUPABASE = True
    DISABLE_SYSTEM_PROXY_FOR_SUPABASE = True
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
    MASTER_LOGIN = "master"
    MASTER_PASSWORD = ""
    MASTER_NAME = "Master SaaS"


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
    config_cls.MASTER_LOGIN = os.getenv("MASTER_LOGIN", "master")
    config_cls.MASTER_PASSWORD = os.getenv("MASTER_PASSWORD", "admin123")
    config_cls.MASTER_NAME = os.getenv("MASTER_NAME", "Master SaaS")
    return config_cls


def get_config():
    env = os.getenv("APP_ENV", "development").lower()
    if env == "production":
        return _hydrate_from_env(ProductionConfig)
    return _hydrate_from_env(DevelopmentConfig)
