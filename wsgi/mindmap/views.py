# -*- coding:utf-8 -*-

import os
import json
import traceback
import StringIO

import requests
from sqlalchemy.orm.exc import NoResultFound

from flask_admin.contrib.sqla import ModelView
from flask_admin import Admin, AdminIndexView
from flask import flash, url_for, redirect, render_template, g, session
from flask_login import current_user

from mindmap import app, db
from mindmappage.models import MindMap
from course.models import Tutorial
from models import User
from user.models import Account
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
            .add_columns(Tutorial.id, Tutorial.type, Tutorial.title, 
                         Tutorial.slug, User.username)\
            .limit(100).all()
        # .order_by(desc(Tutorial.like)).limit(100)
    except NoResultFound:
        app.logger.debug(traceback.print_exc())

    meta = {'title': u'推荐 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('recommendlist.html', maps=mind_maps,
                           tutorials=tutorials[::-1], meta=meta)


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
                           tutorials=tutorials[::-1], isSelf=user.get_id() == g.user.get_id(),
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
def page_not_found(error):
    meta = {'title': u'页面不存在 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind 启发式学习 智能学习 在线教育'}
    return render_template('404.html', meta=meta, error=error)

 
@app.route("/qnfile/<fname>")
def qnfile(fname):
    fpname = os.path.join(os.path.dirname(__file__), "qnfile", fname)
    if os.path.isfile(fpname):
        fp = open(fpname)
        content = json.load(fp, strict=False)
        fp.close()
    else:
        real_link = "http://7xt8es.com1.z0.glb.clouddn.com/%s?v=%s" % (
                    '/'.join(e for e in fname.split('-')), str(random.randint(1, 10000)))
        r = requests.get(real_link)
        content = json.loads(r.content, strict=False)
    return json.dumps(content, ensure_ascii=False)


@app.route("/search_awesome/<tag>")
def awesome_dict(tag):
    # rule = or_(AwesomeItem.name == tag, AwesomeItem.cn == tag, AwesomeItem.parent.any(name=tag),
    #            AwesomeItem.parent.any(cn=tag))
    # results = AwesomeItem.query.filter(rule)
    # item_set = []
    # for ele in results:
    #     tags = [(tag.name, tag.cn) for tag in ele.parent]
    #     item_set.append(convert_awesome_item(ele, tags))
    # return json.dumps({"list": item_set}, ensure_ascii=False)
    pass


# class ItemView(ModelView):
#     can_delete = True
#     can_create = True
#     can_edit = True
#     # columns_labels = dict()
#     column_exclude_list = (
#         'id',
#     )
#     column_filters = ('name', 'cn', 'category')
#     column_searchable_list = ('name', 'cn', 'category')


class ResView(ModelView):
    can_delete = False
    can_create = True
    can_edit = False
    # columns_labels = dict()
    column_exclude_list = (
        'user_id',
        'password',
        'registered_on'
    )


admin = Admin(app, index_view=AdminIndexView(name="导航栏", url="/mimagly"))

admin.add_view(ResView(Account, db.session, name=u"账号"))
