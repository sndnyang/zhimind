# -*- coding:utf-8 -*-
import os
import urllib2
from datetime import datetime

import sqlalchemy
from sqlalchemy import desc

from flask import request, flash, url_for, redirect, render_template, g,\
session, json, send_from_directory

from flask.ext.login import LoginManager, current_user, logout_user, \
login_user, login_required

from mindmap import app, db, login_manager

from models import * 

from forms import *

from validation import *
from utility import *

import traceback

@app.route('/')
@app.route('/index')
@app.route('/index.html')
def index():
    return render_template('index.html')

@app.route('/android')
@app.route('/android.html')
def android():
    return render_template('android.html')

@app.route('/recommendlist')
@app.route('/recommendlist.html')
def recommendlist():
    mindmaps = None
    tutorials = None
    try:
        mindmaps = MindMap.query.join(User).add_columns(MindMap.id, 
                MindMap.title, User.username).limit(100)
        tutorials = Tutorial.query.join(User).add_columns(Tutorial.id,
                Tutorial.type, Tutorial.title, User.username).limit(100)
                       # .order_by(desc(Tutorial.like)).limit(100)
    except:
        app.logger.debug(traceback.print_exc())

    return render_template('recommendlist.html', maps = mindmaps, 
            tutorials = tutorials)



@app.route('/tutorial/<link>')
def tutorial(link):
    try:
        tutorial = Tutorial.query.get(link)
        name = tutorial.get_title()
    except:
        app.logger.debug(traceback.print_exc())
    return render_template('tutorial.html', link = link, name=name)


@app.route('/convert/<link>')
def convert(link):

    response = {'response': False}
    try:
        tutorial = Tutorial.query.get(link)
        real_link = tutorial.get_url()
        response = md_qa_parse(real_link)

        session['answer'] = response['answer']
    except:
        app.logger.debug(traceback.print_exc())

    return json.dumps(response, ensure_ascii=False)


@app.route('/checkTextAnswer', methods=["POST"])
def checkAnswer():
    no = int(request.json.get('id', None))-1
    expression = request.json.get('expression', None)
    response = {'response': False}

    if not expression:
        return json.dumps(response)

    answers = session['answer'][no].split('@')
    if len(answers) != len(expression):
        return json.dumps(response)

    for i in range(len(answers)):
        keys = answers[i].split()
        user  = expression[i]
        for e in keys:
            if e not in user:
                app.logger.debug("%s %s wrong" % (e, user))
                return json.dumps(response)

    response['response'] = True
    return json.dumps(response)


@app.route('/cmp_math', methods=["POST"])
def cmp_math():

    no = int(request.json.get('id', None))-1
    expression = request.json.get('expression', None)
    ret = {'response': True}
    if not expression:
        ret['response'] = False

    answers = session['answer'][no].split('@')
    if len(answers) != len(expression):
        return json.dumps(ret, ensure_ascii=False)

    for i in range(len(answers)):
        info = checkCmpExpression(answers[i], expression[i])
        #app.logger.debug(info)
        if info:
            ret['response'] = False
            ret['info'] = info 
            break

    return json.dumps(ret, ensure_ascii=False)

@app.route('/practice/<link>')
def program_practice(link):
    base_link = '/'
    try:
        tutorial = Tutorial.query.get(link)
        real_link = tutorial.get_url()
        base_link = '/'.join(real_link.split('/')[:-1])
        name = tutorial.get_title()
    except:
        app.logger.debug(traceback.print_exc())

    return render_template('practice.html', link = link, base=base_link,
            name=name)
    
@app.route('/newmap')
def newmap():
    return render_template('map.html', mapid = 'null')

@app.route('/map/<mapid>', methods=['GET'])
def map_page(mapid):
    if not mapid:
        return redirect(url_for('index'))
    return render_template('map.html', mapid = mapid)

@app.route('/loadmap/<mapid>', methods=['GET'])
def load_map(mapid):
    if mapid == 'null':
        return json.dumps({'name':'root'})

    ret_code = {'error':'not exist'}
    
    try:
        mindmap = MindMap.query.get(mapid)
        entrylist = EntryMastery.query.filter_by(user_id=mindmap.get_user_id(),
                mindmap_id=mindmap.get_id()).all()

        ret_code = mindmap.map
        if len(entrylist):
            add_mastery_in_json(ret_code, entrylist)
        
    except:
        app.logger.debug(traceback.print_exc())

    return json.dumps(ret_code)

@app.route('/linkquiz', methods=['POST'])
@login_required
def link_quiz():

    name = request.json.get('name', None)
    mapid = request.json.get('mapid', None)
    tutorid = request.json.get('tutorid', None)
    parent = request.json.get('parent', None)

    ret = {'response': False}
    if name and mapid and tutorid:
        try:
            result = EntryMastery.query.filter_by(user_id=g.user.get_id(),
                    mindmap_id=mapid, name=name, tutor_id =
                    tutorid).one_or_none()
        except sqlalchemy.orm.exc.MultipleResultsFound:
            return json.dumps(ret, ensure_ascii=False)

        if result is None:
            entry = EntryMastery(name, parent)
            entry.user_id = g.user.get_id()
            entry.mindmap_id = mapid
            entry.tutor_id = tutorid
            db.session.add(entry)
            db.session.commit()

    ret['response'] = True

    return json.dumps(ret, ensure_ascii=False)


@app.route('/update_mastery', methods=['POST'])
@login_required
def update_entry_master():

    ret = {'response': False}
    tutorid = request.json.get('tutor_id', None)
    if not tutorid:
        ret['info'] = u'未指定教程id'

    name = request.json.get('name', None)
    if not tutorid:
        ret['info'] = u'未指定id'

    mapid = request.json.get('id', None)
    if not mapid:
        ret['info'] = u'未指定导图id'

    parent = request.json.get('parent', None)

    if 'info' in ret:
        return json.dumps(ret, ensure_ascii=False)

    results = EntryMastery.query.filter_by(user_id=g.user.get_id(),
            mindmap_id=mapid, name=name, tutor_id=tutorid)

    flag = False
    
    for entry in results:
        if parent and entry.parent == parent:
            entry.mastery += 1
            db.session.commit()
            flag = True
        if not parent:
            entry.mastery += 1
            db.session.commit()
            flag = True

    if not flag:
        ret['info'] = u'未找到名为 %s, 且父结点为 %s 的结点' % (name, parent)
        return json.dumps(ret, ensure_ascii=False)

    ret['response'] = True
    return json.dumps(ret, ensure_ascii=False)

@app.route('/newtutorial', methods=['POST'])
@app.route('/newpractice', methods=['POST'])
@login_required
def create_tutorial():
    title = request.json.get('title')
    url = request.json.get('url')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(url=url, user_id=g.user.get_id()).one_or_none()
    except sqlalchemy.orm.exc.MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    path = request.path
    qtype = "tutorial"
    if 'practice' in path:
        qtype = 'practice'

    if tutorial is None:
        tutorial = Tutorial(title, url, qtype)
        tutorial.user_id = g.user.get_id()
        db.session.add(tutorial)
        db.session.commit()

    ret['error'] = 'success'
    ret['uuid'] = tutorial.get_id()

    return json.dumps(ret, ensure_ascii=False)

@app.route('/editTutorial', methods=['POST'])
@login_required
def edit_tutorial():
    tutorial_id = request.json.get('id')
    title = request.json.get('title')
    url = request.json.get('url')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(id=tutorial_id,
                user_id=g.user.get_id()).one_or_none()
        if not tutorial:
            return json.dumps({'error': tutorial_id + ' not exists'})
    except sqlalchemy.orm.exc.MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    if title != 'no':
        tutorial.title = title

    if url != 'no':
        tutorial.url = url

    if title != 'no' or url != 'no':
        try:
            db.session.commit()
        except:
            return json.dumps({'error': u'数据库更新异常'}, ensure_ascii=False)

    ret['error'] = 'success'
    return json.dumps(ret, ensure_ascii=False)


@app.route('/deleteTutorial', methods=['POST'])
@login_required
def delete_tutorial():
    tutorial_id = request.json.get('id')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(id=tutorial_id,
                user_id=g.user.get_id()).one_or_none()
        if not tutorial:
            return json.dumps({'error': tutorial_id + ' not exists'})
    except sqlalchemy.orm.exc.MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    try:
        db.session.delete(tutorial)
        db.session.commit()
    except:
        return json.dumps({'error': u'数据库更新异常'}, ensure_ascii=False)

    ret['error'] = 'success'
    return json.dumps(ret, ensure_ascii=False)


@app.route('/save', methods=['POST'])
@login_required
def save_map():
    if request.method == 'GET':
        return ''

    if g.user is None or not g.user.is_authenticated:
        return u"用户未登录"

    title = request.json.get('title', '')
    data = request.json.get('data', '')

    now = datetime.now()
    if not g.user.check_frequence(now):
        return u'用户上次操作在一分钟之内，太过频繁'

    try:
        mindmap = MindMap.query.filter_by(title=title, user_id=g.user.get_id()).one_or_none()
    except sqlalchemy.orm.exc.MultipleResultsFound:
        return u'重复数据异常'

    if mindmap is None:
        newmap = MindMap(title, data)
        newmap.user_id = g.user.get_id()
        newmap.last_edit = now
        db.session.add(newmap)
        g.user.last_edit = now
        db.session.commit()
        return u'成功添加新的导图'
    else:
        mindmap.map = data
        mindmap.last_edit = now
        g.user.last_edit = now
        db.session.commit()
        return u'成功更新导图'


@app.route('/verifycode')
def verify_code():
    code_img, strs = create_validate_code() 
    session['code_text'] = strs
    buf = StringIO.StringIO() 
    code_img.save(buf,'JPEG',quality=70) 
 
    buf_str = buf.getvalue() 
    response = app.make_response(buf_str)  
    response.headers['Content-Type'] = 'image/jpeg'
    return response


@app.route('/register', methods=['GET', 'POST'])
def register():
    if g.user is not None and g.user.is_authenticated:
        return redirect(url_for('index'))

    form = RegistrationForm(request.form)
    if request.method == 'POST' and form.validate():
        username = request.form['username']
        if User.query.filter_by(username=username).first():
            flash(u'该用户名已被注册')
            return render_template('register.html', form=form)

        code_text = session['code_text']

        if form.verification_code.data == code_text:
            user = User(username, request.form['password'],request.form['email'])
            try:
                db.session.add(user)
                db.session.commit()
                flash('User successfully registered')
                return redirect(url_for('login'))
            except:
                db.session.rollback()
                flash(u'注册失败')
        else:
            flash(u'验证码错误')
    
    return render_template('register.html', form=form)
 

@app.route('/login',methods=['GET','POST'])
def login():
    if request.method == 'GET':
        return render_template('login.html')

    username = request.form['username']
    password = request.form['password']
    remember_me = False
    if 'remember_me' in request.form:
        remember_me = True

    registered_user = User.query.filter_by(username=username).first()
    if registered_user is None:
        flash('Username is invalid' , 'error')
        return redirect(url_for('login'))
    if not registered_user.check_password(password):
        flash('Password is invalid','error')
        return redirect(url_for('login'))
    login_user(registered_user, remember = remember_me)
    flash('Logged in successfully')
    return redirect(request.args.get('next') or url_for('index'))


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/user/<nickname>')
def user(nickname):
    user = User.query.filter_by(username = nickname).first()
    if user == None:
        flash(u'不存在用户：' + nickname + '！')
        return redirect(url_for('index'))

    mindmaps = None
    try:
        mindmaps = MindMap.query.filter_by(user_id=user.get_id()).all()
    except:
        app.logger.error("use " + nickname + " fetch maps failed")

    tutorials = None
    try:
        tutorials = Tutorial.query.filter_by(user_id=user.get_id()).all()
    except:
        app.logger.error("use " + nickname + " fetch maps failed")

    return render_template('user.html', user = user, maps = mindmaps, 
            tutorials = tutorials, isSelf = user.get_id() == g.user.get_id())

@login_manager.user_loader
def load_user(id):
    return User.query.get(id)


@app.before_request
def before_request():
    g.user = current_user
