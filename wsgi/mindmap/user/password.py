# -*- coding:utf-8 -*-

import os
import json
import traceback

from flask import request, flash, url_for, redirect, render_template, g, \
    session, Blueprint

from flask_login import logout_user, login_user, login_required
from flask_jwt_extended import JWTManager, create_access_token
from sqlalchemy import and_

from mindmap import app, login_manager
from forms import *
from models import *


mima_page = Blueprint('mima', __name__,
                      template_folder=os.path.join(
                              os.path.dirname(__file__), 'templates'),
                      static_folder="static")


@mima_page.route('/add.html', methods=['GET', 'POST'])
@login_required
def register():
    if g.user is not None and g.user.get_name() != "sndnyang":
        return redirect(url_for('index'))

    form = AccountForm(request.form)
    meta = {'title': u'密码登记 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    if request.method == 'POST' and form.validate():
        appname = request.form['appname']
        username = request.form['username']
        rule = and_(Account.appname==appname, Account.username==username)
        account = Account.query.filter(rule).one_or_none()
        if account and not request.form.get("cover"):
            flash('Account already exists')
            return render_template('mima_add.html', form=form, meta=meta)

        try:
            if request.form.get("cover"):
                account.hint = request.form['hint']
                account.password = request.form['password']
            else:
                account = Account(appname, username, request.form['password'],
                               request.form['hint'])
                db.session.add(account)
            db.session.commit()
            return redirect(url_for('mima.recall'))
        except:
            db.session.rollback()
            flash(u'密码登记失败')
    return render_template('mima_add.html', form=form, meta=meta)


@mima_page.route('/my.html', methods=['GET', 'POST'])
@login_required
def recall():
    if g.user is not None and g.user.get_name() != "sndnyang":
        return redirect(url_for('index'))
    meta = {'title': u'密码登记 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('mima_recall.html', meta=meta)


@mima_page.route('/check', methods=['POST'])
def checkMima():
    appname = request.json['appname']
    username = request.json['username']
    password = request.json['password']

    rule = and_(Account.appname==appname, Account.username==username)
    account = Account.query.filter(rule).one_or_none()
    result = {}
    if not account:
        result = {"error": u"用户不存在"}
    elif not account.check_password(password):
        result = {"error": u"密码不正确", "hint": account.hint}

    return json.dumps(result, ensure_ascii=False)


