import sys

reload(sys)

if sys.getdefaultencoding() != 'utf8':
    sys.setdefaultencoding('utf8')

import os


from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask.ext.login import LoginManager

app = Flask(__name__, static_folder= os.path.join(os.path.dirname(__file__), "..", "static"))
app.config.from_pyfile('flaskapp.cfg')

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)

from models import *
from views import *
