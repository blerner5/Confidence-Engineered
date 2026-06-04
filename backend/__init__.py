from flask import Flask
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = "mysql+pymysql://database-confidenceengineered.cv7jasd3ohgn.us-east-1.rds.amazonaws.com -P 3306 -u masterpassword -p --ssl-mode=VERIFY_IDENTITY --ssl-ca=./global-bundle.pem"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    from . import models  # make sure models are registered

    return app