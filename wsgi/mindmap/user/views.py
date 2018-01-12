# -*- coding:utf-8 -*-

import os
import json

from flask import request, flash, url_for, redirect, render_template, g, \
    session, Blueprint

from flask_login import logout_user, login_user, login_required
from flask_jwt_extended import JWTManager, create_access_token

from mindmap import app, login_manager
from forms import *
from ..models import *

jwt = JWTManager(app)

user_page = Blueprint('user', __name__,
                      template_folder=os.path.join(
                              os.path.dirname(__file__), 'templates'),
                      static_folder="static")


@user_page.route('/register', methods=['GET', 'POST'])
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
                return redirect(url_for('user.login'))
            except:
                db.session.rollback()
                flash(u'注册失败')
        else:
            flash(u'验证码错误')
    meta = {'title': u'注册 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('register.html', form=form, meta=meta)


@user_page.route('/login', methods=['GET', 'POST'])
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
        return redirect(url_for('user.login'))
    if not registered_user.check_password(password):
        flash('Password is invalid', 'error')
        return redirect(url_for('user.login'))
    login_user(registered_user, remember=remember_me)
    flash('Logged in successfully')
    return redirect(request.args.get('next') or url_for('index'))


@user_page.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('index'))


@login_manager.user_loader
def load_user(uid):
    return User.query.get(uid)


@app.route("/developer/token.html", methods=['GET', 'POST'])
@login_required
def token_page():
    auth_token = create_access_token(identity=g.user.get_id())
    meta = {'title': u'获取密钥 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('token.html', meta=meta, token=auth_token, name=g.user.get_name())


@app.route("/developer/token", methods=['GET'])
@login_required
def get_token():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'status': False,
                           'msg': u'用户操作太过频繁,请稍候再试'},
                          ensure_ascii=False)
    auth_token = create_access_token(identity=g.user.get_id())
    return json.dumps({'token': auth_token}, ensure_ascii=False)


