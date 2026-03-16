import os
import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL não configurada no .env!")
else:
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        result = cur.fetchone()
        print(f"Conexão OK, resultado: {result}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Erro ao conectar ao banco: {e}")
