# -*- coding:utf-8 -*-

import os
from flask import Blueprint

college_page = Blueprint('college_list', __name__,
        template_folder = os.path.join(os.path.dirname(__file__), 'templates'))

from . import views

