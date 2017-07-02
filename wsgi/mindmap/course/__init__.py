# -*- coding:utf-8 -*-

import os
from flask import Blueprint

course_page = Blueprint('course', __name__,
        template_folder = os.path.join(os.path.dirname(__file__), 'templates'))

from . import tutorial, practice, checker

