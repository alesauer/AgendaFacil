from backend.routes.agendamentos import agendamentos_bp
from backend.routes.auth import auth_bp
from backend.routes.barbearia import barbearia_bp
from backend.routes.categorias import categorias_bp
from backend.routes.clientes import clientes_bp
from backend.routes.clientes_assinaturas import clientes_assinaturas_bp
from backend.routes.dashboard import dashboard_bp
from backend.routes.financeiro import financeiro_bp
from backend.routes.horarios import horarios_bp
from backend.routes.master import master_bp
from backend.routes.master_settings import master_settings_bp
from backend.routes.notifications import notifications_bp
from backend.routes.profissionais import profissionais_bp
from backend.routes.servicos import servicos_bp
from backend.routes.stripe import stripe_bp


def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(barbearia_bp)
    app.register_blueprint(clientes_bp)
    app.register_blueprint(clientes_assinaturas_bp)
    app.register_blueprint(categorias_bp)
    app.register_blueprint(profissionais_bp)
    app.register_blueprint(servicos_bp)
    app.register_blueprint(agendamentos_bp)
    app.register_blueprint(horarios_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(financeiro_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(master_bp)
    app.register_blueprint(master_settings_bp)
    app.register_blueprint(stripe_bp)
