import os


class Config:
    APP_ENV = "development"
    SECRET_KEY = "change-this-secret"
    JWT_EXPIRES_MINUTES = 720

    DATABASE_URL = ""
    SUPABASE_URL = ""
    SUPABASE_KEY = ""
    SUPABASE_ONLY = True
    BYPASS_PROXY_FOR_SUPABASE = False
    DISABLE_SYSTEM_PROXY_FOR_SUPABASE = False
    SUPABASE_HTTP_TIMEOUT_SECONDS = 8
    SUPABASE_TENANT_RETRIES = 3

    DEFAULT_BARBEARIA_SLUG = ""


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
    config_cls.BYPASS_PROXY_FOR_SUPABASE = os.getenv("BYPASS_PROXY_FOR_SUPABASE", "false").lower() == "true"
    config_cls.DISABLE_SYSTEM_PROXY_FOR_SUPABASE = os.getenv("DISABLE_SYSTEM_PROXY_FOR_SUPABASE", "false").lower() == "true"
    config_cls.SUPABASE_HTTP_TIMEOUT_SECONDS = int(os.getenv("SUPABASE_HTTP_TIMEOUT_SECONDS", "8"))
    config_cls.SUPABASE_TENANT_RETRIES = int(os.getenv("SUPABASE_TENANT_RETRIES", "3"))
    config_cls.DEFAULT_BARBEARIA_SLUG = os.getenv("DEFAULT_BARBEARIA_SLUG", "")
    return config_cls


def get_config():
    env = os.getenv("APP_ENV", "development").lower()
    if env == "production":
        return _hydrate_from_env(ProductionConfig)
    return _hydrate_from_env(DevelopmentConfig)
