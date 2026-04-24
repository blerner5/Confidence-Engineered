import os
import sys
import pytest

# Ensure the backend directory is securely in the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from app import app as flask_app, db

@pytest.fixture
def app():
    """Generates an explicit test instance of the Flask backend, fully isolated in memory."""
    # Force mock mode by explicitly removing OpenAI key during tests if it exists
    if "OPENAI_API_KEY" in os.environ:
        del os.environ["OPENAI_API_KEY"]
        
    flask_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "WTF_CSRF_ENABLED": False,
    })

    with flask_app.app_context():
        # Clean architecture setup: create fresh schema purely in memory
        db.create_all()
        yield flask_app
        # Teardown the ephemeral schema
        db.drop_all()

@pytest.fixture
def client(app):
    """Provides a synthetic test client to push simulated requests internally."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Command line runner for Flask CLI tests, if needed later."""
    return app.test_cli_runner()
