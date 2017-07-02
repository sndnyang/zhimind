# -*- coding:utf-8 -*-
import traceback

from sqlalchemy.orm.exc import NoResultFound

from flask import request, render_template

from mindmap import app

from models import *
from qa_parser import *
from AnswerChecker import *
from utility import *

from . import course_page


@course_page.route('/practice/<link>')
def program_practice(link):
    base_link = '/'
    name = ''
    try:
        tutorial = Tutorial.query.get(link)
        if not tutorial:
            tutorial = Tutorial.query.filter_by(slug=link).one_or_none()
        real_link = tutorial.get_url()
        base_link = '/'.join(real_link.split('/')[:-1])
        name = tutorial.get_title()
        tid = tutorial.get_id()
        if link != tid:
            link = tid
    except NoResultFound:
        app.logger.debug(traceback.print_exc())

    meta = gen_meta_for_tp(name, app.redis.get(link))
    return render_template('practice.html', link=link, base=base_link, name=name, meta=meta)

