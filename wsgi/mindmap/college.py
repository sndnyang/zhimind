# -*- coding:utf-8 -*-

import os
import traceback

from flask import request, flash, url_for, redirect, render_template, g, \
    session, json
from flask_login import login_required
from sqlalchemy.orm.exc import NoResultFound
from wtforms import Form, TextField, StringField, validators

from mindmap import app, db
from models import College, TempCollege
from validation import *


@app.route('/college.html')
def college_page():
    meta = {'title': u'美国大学库 知维图 -- 互联网学习实验室',
            'description': u'美国大学申请信息库，包括GPA、英语成绩、截止日期、学费等',
            'keywords': u'zhimind 美国 大学 CS 学费 截止日期'}
    return render_template('universityList.html', meta=meta, temp=0)

@app.route('/tempcollege.html')
@login_required
def temp_college_page():
    if g.user.get_name() != 'sndnyang':
        abort(404)
    meta = {'title': u'美国大学库 知维图 -- 互联网学习实验室',
            'description': u'美国大学申请信息库，包括GPA、英语成绩、截止日期、学费等',
            'keywords': u'zhimind 美国 大学 CS 学费 截止日期'}
    return render_template('universityList.html', meta=meta, temp=1)

def convert_dict(e):
    item = {'id': e.id,
            'name': e.name,
            'degree': e.degree,
            'major': e.major,
            'site_url': e.site_url,
            'gpa': e.gpa,
            'gpa_url': e.gpa_url,
            'tuition': e.tuition,
            'tuition_url': e.tuition_url,
            'fall': e.fall,
            'spring': e.spring,
            'deadline_url': e.deadline_url,
            'toefl': e.toefl,
            'ielts': e.ielts,
            'eng_url': e.eng_url,
            'gre': e.gre,
            'gre_url': e.gre_url,
            'rl': e.rl,
            'evalue': e.evalue,
            'finance': e.finance,
            'docum_url': e.docum_url
            }
    return item

@app.route('/collegeList')
@app.route('/collegeList/<int:pageno>')
def collegeListPage(pageno = 1):
    base_dir = os.path.dirname(__file__)
    fname = os.path.join(base_dir, '..', 'static', 'data', 'college.json')
    college_set = []
    try:
        data = json.load(open(fname))
        college_list = College.query.paginate(int(pageno), 25).items
        for e in college_list:
            college_set.append(convert_dict(e))
        for e in data:
            college_set.append(e)
    except Exception, e:
        app.logger.debug(traceback.print_exc())

    return json.dumps(college_set, ensure_ascii=False)

@app.route('/collegeList1')
def tempcollegeList():
    college_set = []
    try:
        college_list = TempCollege.query.all()
        for e in college_list:
            college_set.append(convert_dict(e))
    except Exception, e:
        app.logger.debug(traceback.print_exc())
        return json.dumps({'error': 'error'})
    return json.dumps(college_set, ensure_ascii=False)

@app.route('/college/<cid>')
def college(cid):
    try:
        college = College.query.get(cid)
        return json.dumps(convert_dict(college), ensure_ascii=False)
    except NoResultFound:
        app.logger.debug(traceback.print_exc())
    return json.dumps({'error': 'not find'}, ensure_ascii=False)

@app.route('/collegeForm/<name>')
def college_form(name):
    meta = {'title': u'美国大学库 知维图 -- 互联网学习实验室',
            'description': u'美国大学申请信息库，包括GPA、英语成绩、截止日期、学费等',
            'keywords': u'zhimind 美国 大学 CS 学费 截止日期'}

    verification_code = StringField(u'验证码', 
            validators=[validators.Required(), validators.Length(4, 4, message=u'填写4位验证码')])
    return render_template('college_form.html', veri=verification_code, meta=meta)

# [START submitted]
@app.route('/college_submitted', methods=['POST'])
def submitted_college():
    verification_code = request.form['verification_code']
    code_text = session['code_text']
    if verification_code != code_text:
        return json.dumps({'error': u'验证码错误'})
    code_img, strs = create_validate_code()
    session['code_text'] = strs
    try:
        name = request.form['name']
        degree = request.form['degree']
        major = request.form['major']
        site_url = request.form['site_url']
        if not name or not degree or not major:
            return json.dumps({'error': u'验证码错误'})
        result = College.query.filter_by(name=name, major=major,
                degree=degree).one_or_none()
        if result is None:
            if g.user and g.user.is_authenticated and g.user.get_name() == 'sndnyang':
                college = College(name, degree, major, site_url)
            else:
                college = TempCollege(name, degree, major, site_url)
        else:
            college = result

        college.gpa = request.form['gpa']
        college.gpa_url = request.form['gpa_url']
        college.tuition = request.form['tuition']
        college.tuition_url = request.form['tuition_url']
        college.deadline_url = request.form['deadline_url']
        college.fall = request.form['fall']
        college.spring = request.form['spring']
        college.gre = request.form['gre']
        college.gre_url = request.form['gre_url']
        college.toefl = request.form['toefl']
        college.ielts = request.form['ielts']
        college.eng_url = request.form['eng_url']
        college.rl = request.form['rl']
        college.evalue = request.form['evalue']
        college.finance = request.form['finance']
        college.docum_url = request.form['docum_url']

        if result is None:
            db.session.add(college)
        db.session.commit()
    except Exception, e:
        app.logger.debug(traceback.print_exc())
        return json.dumps({'error': u'错误'})

    # comments = request.form['comments']

    return json.dumps({'info': u'成功'})

@app.route('/collegeData/approve', methods=['POST'])
def college_approve():
    no = request.json.get('id', None)
    action = str(request.json.get('type', None))
    if not no or not action:
        return json.dumps({'error': '%s %s not right' % (no, action)}, ensure_ascii=False)

    app.logger.debug(no + ' ' + action)
    try:
        college = TempCollege.query.get(no)
        if action == 1:
            db.session.delete(college)
        else:
            result = College.query.filter_by(name=college.name, major=
                    college.major, degree=college.degree).one_or_none()
            if result is None:
                result = College(college.name, college.degree, college.major,
                        college.site_url)
                result.set(college)
                db.session.add(result)
            else:
                result.set(college)
            db.session.delete(college)
        db.session.commit()
        return json.dumps({'info': 'success'}, ensure_ascii=False)
    except Exception, e:
        app.logger.debug(traceback.print_exc())
    return json.dumps({'error': 'not find'}, ensure_ascii=False)