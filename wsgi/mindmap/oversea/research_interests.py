# -*- coding:utf-8 -*-

import os
import traceback

from flask import flash, request, render_template, g, session, json, Blueprint, abort
from flask_login import login_required
from sqlalchemy.orm.exc import NoResultFound
from wtforms import StringField, validators

from ..validation import *
from mindmap import app, db

from crawler import ResearchCrawler


research_page = Blueprint('research_page', __name__,
                         template_folder=os.path.join(
                             os.path.dirname(__file__), 'templates'),
                         static_folder="static")


@research_page.route('/research.html')
@research_page.route('/research')
def research_index():
    meta = {'title': u'学者研究兴趣 知维图 -- 互联网学习实验室',
            'description': u'学者研究兴趣信息库，主要就是学校、主页、研究方向、招生与否',
            'keywords': u'zhimind 美国 大学 CS 研究方向 research interests 招生'}
    return render_template('research.html', meta=meta, temp=0)


@research_page.route('/research_form.html')
def research_form():
    meta = {'title': u'学者研究兴趣 知维图 -- 互联网学习实验室',
            'description': u'学者研究兴趣信息库，主要就是学校、主页、研究方向、招生与否',
            'keywords': u'zhimind 美国 大学 CS 研究方向 research interests 招生'}
    verification_code = StringField(u'验证码', 
                                    validators=[validators.Required(),
                                                validators.Length
                                                (4, 4, message=u'填写4位验证码')])
    return render_template('research_form.html', veri=verification_code, meta=meta)


@research_page.route('/getResearchProgress', methods=['POST'])
def process():
    return json.dumps({'info': session['research_process']}, ensure_ascii=False)


@research_page.route('/research_submitted', methods=['POST'])
def submitted_research():
    #verification_code = request.form['verification_code']
    # code_text = session['code_text']
    # if verification_code != code_text:
    #    return json.dumps({'error': u'验证码错误'}, ensure_ascii=False)
    #approve = request.form['approve']
    # if approve == '1':
    #    json.dumps({'info': u'成功'}, ensure_ascii=False)
    # code_img, code_string = create_validate_code()
    # session['code_text'] = code_string

    #college_name = request.form['college_name']
    #major = request.form['major']
    directory_url = request.form['directory_url']
    professor_url = request.form['professor_url']
    app.logger.info(directory_url)
    crawl = ResearchCrawler()
    count, faculty_list = crawl.crawl_faculty_list(directory_url, professor_url)
    session['research_process'] = "%d,0" % count
    app.logger.info(session['research_process'])
    link_list = []
    i = 0
    for f in faculty_list:
        link_list.append(crawl.dive_into_page(f))
        i += 1
        session['research_process'] = "%d,%d" % (count, i)
    app.logger.info(session['research_process'] + "finish")

    return json.dumps({'info': u'成功', "list": link_list}, ensure_ascii=False)