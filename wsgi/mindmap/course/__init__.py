# -*- coding:utf-8 -*-

from flask import Blueprint

college_page = Blueprint('college_list', __name__,
        template_folder = 'templates')

from . import views

