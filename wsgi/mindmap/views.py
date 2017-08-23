# -*- coding:utf-8 -*-
import traceback
import StringIO

from sqlalchemy import desc
from sqlalchemy.orm.exc import NoResultFound

from flask import request, flash, url_for, redirect, render_template, g, \
    session, json

from flask_login import current_user, logout_user, login_user, login_required
from forms import *

from mindmap import app, db, login_manager
from models import *
from mindmappage.models import MindMap
from course.models import Tutorial
from validation import *


@app.route('/')
@app.route('/index')
@app.route('/index.html')
def index():
    if g.user is None or not g.user.is_authenticated:
        return recommendlist()
    else:
        return get_user(g.user.get_name())


@app.route('/android')
@app.route('/android.html')
def android():
    meta = {'title': u'知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('android.html', mapid="", meta=meta)


@app.route('/recommendlist')
@app.route('/recommendlist.html')
def recommendlist():
    mind_maps = None
    tutorials = None
    try:
        mind_maps = MindMap.query.join(User)\
            .add_columns(MindMap.id, MindMap.title, User.username)\
            .limit(100).all()
        tutorials = Tutorial.query.join(User)\
            .add_columns(Tutorial.id, Tutorial.type, Tutorial.title, User.username)\
            .limit(100).all()
        # .order_by(desc(Tutorial.like)).limit(100)
    except NoResultFound:
        app.logger.debug(traceback.print_exc())

    meta = {'title': u'推荐 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('recommendlist.html', maps=mind_maps,
                           tutorials=tutorials, meta=meta)


@app.route('/verifycode')
def verify_code():
    code_img, strs = create_validate_code()
    session['code_text'] = strs
    buf = StringIO.StringIO()
    code_img.save(buf, 'JPEG', quality=70)

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
            meta = {'title': u'注册 知维图 -- 互联网学习实验室',
                    'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
                    'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
            return render_template('register.html', form=form, meta=meta)

        code_text = session['code_text']

        if form.code.data == code_text:
            user = User(username, request.form['password'], request.form['email'])
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
    meta = {'title': u'注册 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('register.html', form=form, meta=meta)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        meta = {'title': u'登录 知维图 -- 互联网学习实验室',
                'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
                'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
        return render_template('login.html', meta=meta)

    username = request.form['username']
    password = request.form['password']
    remember_me = False
    if 'remember_me' in request.form:
        remember_me = True

    registered_user = User.query.filter_by(username=username).first()
    if registered_user is None:
        flash('Username is invalid', 'error')
        return redirect(url_for('login'))
    if not registered_user.check_password(password):
        flash('Password is invalid', 'error')
        return redirect(url_for('login'))
    login_user(registered_user, remember=remember_me)
    flash('Logged in successfully')
    return redirect(request.args.get('next') or url_for('index'))


@app.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))


@app.route('/user/<nickname>')
def get_user(nickname):
    user = User.query.filter_by(username=nickname).first()
    if not user:
        flash(u'不存在用户：' + nickname + '！')
        return redirect(url_for('index'))

    mind_maps = None
    try:
        mind_maps = MindMap.query.filter_by(user_id=user.get_id()).all()
    except:
        app.logger.error("use " + nickname + " fetch maps failed")

    tutorials = None
    try:
        tutorials = Tutorial.query.filter_by(user_id=user.get_id()).all()
    except:
        app.logger.error("use " + nickname + " fetch tutorials failed")

    meta = {'title': u'用户 %s 主页 知维图 -- 互联网学习实验室' % nickname,
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('user.html', user=user, maps=mind_maps,
                           tutorials=tutorials, isSelf=user.get_id() == g.user.get_id(),
                           meta=meta)


@login_manager.user_loader
def load_user(id):
    return User.query.get(id)


@app.before_request
def before_request():
    g.user = current_user


@app.errorhandler(404)
def page_not_found(error):
    meta = {'title': u'页面不存在 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind 启发式学习 智能学习 在线教育'}
    return render_template('404.html', meta=meta)

