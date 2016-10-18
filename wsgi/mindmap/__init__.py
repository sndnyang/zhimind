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

import redis

pool = redis.ConnectionPool(host=os.environ.get('OPENSHIFT_REDIS_HOST', 'localhost'),
        port=int(os.environ.get('OPENSHIFT_REDIS_PORT', '16379')),
        password=os.environ.get('REDIS_PASSWORD', None))

app.redis = redis.StrictRedis(connection_pool = pool)

from models import *
from views import *
