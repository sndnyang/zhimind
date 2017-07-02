# -*- coding:utf-8 -*-

import os
from flask import Blueprint

map_page = Blueprint('map page', __name__,
        template_folder = os.path.join(os.path.dirname(__file__), 'templates'))

from . import views

