# -*- coding:utf-8 -*-
import traceback
import StringIO

from sqlalchemy.orm.exc import NoResultFound

from flask import flash, url_for, redirect, render_template, g, session

from flask_login import current_user

from mindmap import app
from mindmappage.models import MindMap
from course.models import Tutorial
from models import User
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


@app.before_request
def before_request():
    g.user = current_user


@app.errorhandler(404)
def page_not_found():
    meta = {'title': u'页面不存在 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind 启发式学习 智能学习 在线教育'}
    return render_template('404.html', meta=meta)
