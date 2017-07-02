# -*- coding:utf-8 -*-

import os
from flask import Blueprint

naodong_word = Blueprint('naodong_word', __name__,
        template_folder = os.path.join(os.path.dirname(__file__), 'templates'))

from . import views

