-- Module 24: Configurações globais runtime para MASTER (draft/publish/rollback)

CREATE TABLE IF NOT EXISTS master_runtime_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    env_key TEXT NOT NULL,
    data_type TEXT NOT NULL DEFAULT 'string',
    is_secret BOOLEAN NOT NULL DEFAULT FALSE,
    requires_restart BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    value_current TEXT,
    value_pending TEXT,
    published_version INTEGER NOT NULL DEFAULT 0,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_master_runtime_settings_data_type
      CHECK (data_type IN ('string', 'number', 'boolean', 'json'))
);

CREATE INDEX IF NOT EXISTS idx_master_runtime_settings_category
    ON master_runtime_settings (category);

CREATE TABLE IF NOT EXISTS master_runtime_config_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INTEGER NOT NULL UNIQUE,
    action TEXT NOT NULL DEFAULT 'publish',
    snapshot JSONB NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_master_runtime_config_releases_action
      CHECK (action IN ('publish', 'rollback'))
);

CREATE INDEX IF NOT EXISTS idx_master_runtime_config_releases_created_at
    ON master_runtime_config_releases (created_at DESC);

CREATE TABLE IF NOT EXISTS master_runtime_settings_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL,
    action TEXT NOT NULL,
    old_masked TEXT,
    new_masked TEXT,
    changed_by TEXT NOT NULL,
    version INTEGER,
    details JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_runtime_settings_audit_key
    ON master_runtime_settings_audit (setting_key, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_master_runtime_settings_audit_version
    ON master_runtime_settings_audit (version);
