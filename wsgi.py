"""Production entry point for the Railway web service."""

from app import app, create_dummy_data, init_db


with app.app_context():
    init_db()
    create_dummy_data()
