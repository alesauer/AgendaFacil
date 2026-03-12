from contextlib import contextmanager

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


pool: ConnectionPool | None = None


def init_db(database_url: str):
    global pool
    if not database_url:
        pool = None
        return
    pool = ConnectionPool(conninfo=database_url, kwargs={"row_factory": dict_row})


def is_db_ready() -> bool:
    return pool is not None


@contextmanager
def get_conn():
    if pool is None:
        raise RuntimeError("DATABASE_URL não configurada")
    with pool.connection() as conn:
        yield conn


def query_all(sql: str, params: tuple = ()):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def query_one(sql: str, params: tuple = ()):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            conn.commit()
            return row


def execute(sql: str, params: tuple = ()):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            conn.commit()
