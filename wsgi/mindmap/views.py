# -*- coding:utf-8 -*-
import os
import urllib2
from datetime import datetime

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
def index():
    return render_template('index.html')

@app.route('/quiz/<path>')
def quiz(path):
    return send_from_directory('quiz', path)
    
@app.route('/tutorial/<link>')
def tutorial(link):
    return render_template('tutorial.html', link = link)

@app.route('/convert/<link>')
def convert(link):
    try:
        tutorial = Tutorial.query.get(link)
        real_link = tutorial.get_url()
    except:
        app.logger.debug(traceback.print_exc())

    urlfp = urllib2.urlopen(real_link)
    response = ""

    response = md_qa_parse(urlfp)

    urlfp.close()

    return json.dumps(response, ensure_ascii=False)


@app.route('/practice/<path>')
def practice(path):
    return send_from_directory(app.root_path + '/practice', path)
    
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


@app.route('/update_mastery', methods=['POST'])
@login_required
def update_entry_master():
    if g.user is None or not g.user.is_authenticated:
        return u"用户未登录"
    name = request.json('name', None)
    if not name:
        return u'未指定知识点名字'

    mapid = request.json('mapid', None)
    if not name:
        return u'未指定所属图id'

    parent = request.json('parent', None)
    mastery = drequest.json('mastery', None)
    results = EntryMastery.query.filter_by(user_id=g.user.get_id(),
            mindmap_id=mapid, name=name)
    for entry in results:
        if parent and entry.parent == parent:
            pass
    else:
        return u'未找到名为 %s, 且父结点为 %s 的结点' % (name, parent)

@app.route('/newtutorial', methods=['POST'])
@login_required
def create_tutorial():
    title = request.json.get('title')
    url = request.json.get('url')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(url=url, user_id=g.user.get_id()).one_or_none()
    except sqlalchemy.orm.exc.MultipleResultsFound:
        return json.dumps(ret)

    if tutorial is None:
        tutorial = Tutorial(title, url)
        tutorial.user_id = g.user.get_id()
        db.session.add(tutorial)
        db.session.commit()
    app.logger.debug(tutorial.get_id())

    ret['error'] = 'success'
    ret['uuid'] = tutorial.get_id()

    return json.dumps(ret)

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
        #app.logger.debug(code_text + '  ' + form.verification_code.data)

        if form.verification_code.data == code_text:
            user = User(username, request.form['password'],request.form['email'])
            try:
                db.session.add(user)
                db.session.commit()
                flash('User successfully registered')
                return redirect(url_for('login'))
            except:
                #app.logger.error(traceback.print_exc())
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
@login_required
def user(nickname):
    user = User.query.filter_by(username = nickname).first()
    if user == None:
        flash('不存在用户：' + nickname + '！')
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
            tutorials = tutorials)

@login_manager.user_loader
def load_user(id):
    return User.query.get(id)


@app.before_request
def before_request():
    g.user = current_user
