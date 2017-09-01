# -*- coding:utf-8 -*-

import os

from flask import request, render_template, session, json, Blueprint
from wtforms import StringField, validators

from ..validation import *
from mindmap import app, db

from models import *
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


@research_page.route('/researchList')
def research_list_page():
    research_set = []
    results = Professor.query.limit(20)
    for ele in results:        
        tags = [tag.name for tag in ele.interests]
        research_set.append({'name': ele.name, 'school': ele.school, 'major': ele.major,
                             'link': ele.school_url, 'website': ele.home_page,
                             'position': ele.position, 'term': ele.term, 'tags': tags})
    return json.dumps(research_set, ensure_ascii=False)


@research_page.route('/getProfessorByInterests/<major>/<interest>')
def get_professor_by_interests(major, interest):
    research_set = []
    results = Professor.query.filter(Professor.interests.any(name=interest)).all()
    for ele in results:        
        tags = [tag.name for tag in ele.interests]
        research_set.append({'name': ele.name, 'school': ele.school, 'major': ele.major,
                             'link': ele.school_url, 'website': ele.home_page,
                             'position': ele.position, 'term': ele.term, 'tags': tags})
    return json.dumps({"list": research_set}, ensure_ascii=False)


@research_page.route('/getMajorInterestsList/<major>')
def get_major_interests_list(major):
    research_set = []
    results = Interests.query.filter_by(major=major).all()
    for ele in results:
        research_set.append({'name': ele.name, 'zh': ele.zh_name})
    return json.dumps({"list": research_set}, ensure_ascii=False)


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


def query_add_interests(tag, major):
    try:
        result = Interests.query.filter_by(name=tag, major=major).one_or_none()
        if result is None:
            result = Interests(tag, major)
            db.session.add(result)
            db.session.commit()
        return result
    except:
        return None


def query_add_professor(name, college_name, major):
    try:
        result = Professor.query.filter_by(name=name, school=college_name, 
                                           major=major).one_or_none()
        if result is None:
            result = Professor(name, college_name, major)
            db.session.add(result)
            db.session.commit()
        return result
    except:
        return None


@research_page.route('/research_submitted', methods=['POST'])
def submitted_research():
    verification_code = request.form['verification_code']
    code_text = session['code_text']
    if verification_code != code_text:
        return json.dumps({'error': u'验证码错误'}, ensure_ascii=False)
    approve = request.form['approve']
    college_name = request.form['college_name']
    major = request.form['major']

    directory_url = request.form['directory_url']
    app.logger.info(directory_url)
    if approve == '1':
        entity = eval(app.redis.get(directory_url))
        code_img, code_string = create_validate_code()
        session['code_text'] = code_string
        for ele in entity:
            professor = None
            if ele.get("name", None):
                professor = query_add_professor(ele.get("name"), college_name, major)
            for tag in ele.get('tags', []):
                tag_obj = query_add_interests(tag, major)
                if professor:
                    professor.interests.append(tag_obj)
            if professor:
                professor.position = ele.get("position")
                professor.term = ele.get("term")
                professor.school_url = ele.get("link", "")
                professor.home_page = ele.get("website", "")
                db.session.commit()
        return json.dumps({'info': u'成功'}, ensure_ascii=False)

    professor_url = request.form['professor_url']
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
    app.redis.set(directory_url, link_list)

    return json.dumps({'info': u'成功', "list": link_list}, ensure_ascii=False)