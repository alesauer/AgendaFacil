from supabase import create_client, Client

# Dados do seu projeto Supabase
url = "https://eczbkkriebkwsepvlnuu.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemJra3JpZWJrd3NlcHZsbnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTcyMDcsImV4cCI6MjA4ODczMzIwN30.QyPdjl6VdtEsTfs9CYBhd5pir4mr5R-R_Ou3ozqjrSA"

try:
    # Criar cliente
    supabase: Client = create_client(url, key)

    # Fazer uma consulta simples em uma tabela
    response = supabase.table("usuarios").select("*").limit(1).execute()

    print("✅ Conexão realizada com sucesso!")
    print("Resposta do banco:", response.data)

except Exception as e:
    print("❌ Erro ao conectar ao Supabase:")
    print(e)
