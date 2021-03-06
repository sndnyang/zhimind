# -*- coding:utf-8 -*-
import os
import traceback

from sqlalchemy.orm.exc import NoResultFound, MultipleResultsFound

from flask import request, url_for, redirect, render_template, g, json, \
    Blueprint

from flask_login import login_required

from mindmap import app

from models import *
from ..course.models import Tutorial
from ..models import User

from utility import *

map_page = Blueprint('map page', __name__,
                     template_folder=os.path.join(os.path.dirname(__file__),
                                                  'templates'))


@map_page.route('/introMap.html')
def intro_map():
    meta = {'title': u'知维图 -- 互联网学习实验室', 'description': u'知维图思维导图示例',
            'keywords': u'zhimind mindmap 思维导图'}
    return render_template('introMap.html', meta=meta)


@map_page.route('/android/<map_id>', methods=['GET'])
def android_map(map_id):
    try:
        mindmap = MindMap.query.get(map_id)
        name = mindmap.title
    except NoResultFound:
        name = ""

    meta = {'title': u'%s 知维图 -- 互联网学习实验室' % name,
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind %s 思维导图 启发式学习 智能学习 在线教育' % name}
    return render_template('android.html', mapid=map_id, meta=meta)


@map_page.route('/recommendlist')
@map_page.route('/recommendlist.html')
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


@map_page.route('/newmap')
def new_map():
    meta = {'title': u'创建新导图 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('map.html', mapid='null', meta=meta)


@map_page.route('/map/<map_id>', methods=['GET'])
def mindmap_page(map_id):
    if not map_id:
        return redirect(url_for('index'))
    try:
        mindmap = MindMap.query.get(map_id)
        name = mindmap.title
    except NoResultFound:
        name = ""
    meta = {'title': u'%s 知维图 -- 互联网学习实验室' % name,
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind %s 思维导图 启发式学习 智能学习 在线教育' % name}
    return render_template('map.html', mapid=map_id, meta=meta)


@map_page.route('/loadmap/<map_id>', methods=['GET'])
def load_map(map_id):
    if map_id == 'null':
        return json.dumps({'name': 'root'})

    ret_code = {'error': 'not exist'}

    try:
        mindmap = MindMap.query.get(map_id)
        entry_list = EntryMastery.query.filter_by(user_id=mindmap.get_user_id()).all()

        ret_code = mindmap.map
        if len(entry_list):
            add_mastery_in_json(ret_code, entry_list)

    except:
        app.logger.debug(traceback.print_exc())

    return json.dumps(ret_code, ensure_ascii=False)


@map_page.route('/linkquiz', methods=['POST'])
@login_required
def link_quiz():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'status': False,
                           'error': u'用户上次操作在一分钟之内，太过频繁'},
                          ensure_ascii=False)
    name = request.json.get('name', None)
    map_id = request.json.get('mapid', None)
    tutor_id = request.json.get('tutorid', None)
    # parent = request.json.get('parent', None)

    ret = {'status': False}
    if name and map_id and tutor_id:
        try:
            result = EntryMastery.query.filter_by(user_id=g.user.get_id(),
                                                  name=name, tutor_id=tutor_id).one_or_none()
        except MultipleResultsFound:
            ret['error'] = u'搜索到多条数据，请联系管理员'
            return json.dumps(ret, ensure_ascii=False)

        if result is None:
            entry = EntryMastery(tutor_id)
            entry.user_id = g.user.get_id()
            g.user.last_edit = now
            db.session.add(entry)
            db.session.commit()

    ret['status'] = True

    return json.dumps(ret, ensure_ascii=False)


@map_page.route('/update_mastery', methods=['POST'])
@login_required
def update_entry_master():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'status': False,
                           'error': u'用户上次操作在一分钟之内，太过频繁',
                          'info': u'用户上次操作在一分钟之内，太过频繁'},#
                          ensure_ascii=False)

    ret = {'status': False}
    tutor_id = request.json.get('tutor_id', None)
    if not tutor_id:
        ret['info'] = u'未指定教程id'

    if 'info' in ret:
        return json.dumps(ret, ensure_ascii=False)

    ret = {'info': u'重复数据异常'}
    app.logger.debug(tutor_id)
    try:
        result = EntryMastery.query.filter_by(user_id=g.user.get_id(), tutor_id=tutor_id).one_or_none()
    except MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    if result:
        result.mastery += 1
        db.session.commit()
    else:
        entry = EntryMastery(tutor_id)
        entry.user_id = g.user.get_id()
        db.session.add(entry)
        db.session.commit()

    ret['status'] = True
    return json.dumps(ret, ensure_ascii=False)
