# -*- coding:utf-8 -*-
import os
from datetime import datetime

from flask import request, flash, url_for, redirect, render_template, g,\
session, json

from flask.ext.login import LoginManager, current_user, logout_user, \
login_user, login_required

from mindmap import app, db, login_manager

from models import * 

from forms import *

from validation import *

@app.route('/')
@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/map/<mapid>', methods=['GET'])
def map_page(mapid):
    if not mapid:
        return redirect(url_for('index'))
    return render_template('map.html', mapid = mapid)

@app.route('/loadmap/<mapid>', methods=['GET'])
def load_map(mapid):
    ret_code = {'error':'not exist'}
    try:
        mindmap = MindMap.query.get(int(mapid))
        ret_code = mindmap.map
    except:
        pass
        
    return json.dumps(ret_code)

@app.route('/save', methods=['POST'])
@login_required
def save_map():
    if request.method == 'GET':
        return ''

    title = request.json.get('title', '')
    data = request.json.get('data', '')

    try:
        mindmap = MindMap.query.filter_by(title=title, user_id=g.user.get_id()).one_or_none()
    except sqlalchemy.orm.exc.MultipleResultsFound:
        return u'重复数据异常'

    if mindmap is None:
        newmap = MindMap(title, data)
        newmap.user_id = g.user.get_id()
        db.session.add(newmap)
        db.session.commit()
        return u'成功添加新的导图'
    else:
        #db.session.commit()
        now = datetime.now()
        if mindmap.check_frequence(now):
            mindmap.map = data
            mindmap.last_edit = now
            #mindmap.update({"map": data, "last_edit": now})
            db.session.commit()
            return u'成功更新导图'
        else:
            return u'上次更新在一分钟之内，太过频繁'


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

    return render_template('user.html', user = user, maps = mindmaps)

@login_manager.user_loader
def load_user(id):
    return User.query.get(int(id))


@app.before_request
def before_request():
    g.user = current_user
