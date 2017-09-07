# -*- coding:utf-8 -*-
import os

from datetime import datetime
import traceback

from sqlalchemy.orm.exc import MultipleResultsFound

from flask import request, render_template, g, session, json, abort, Blueprint

from flask_login import login_required
from flask_msearch import Search
from flask_jwt_extended import jwt_required, get_jwt_identity
from whoosh.index import LockError
from jieba.analyse import ChineseAnalyzer

from mindmap import app, db
from utility import *
from models import *
from ..models import User
from ..mindmappage.models import MindMap
from qa_parser import *
from AnswerChecker import *

tutorial_page = Blueprint('tutorial_page', __name__,
                          template_folder=os.path.join(
                              os.path.dirname(__file__), 'templates'))

search = Search(db=db, analyzer=ChineseAnalyzer())

try:
    search.init_app(app)
    search.create_index(update=True)
except LockError:
    pass


@tutorial_page.route('/editor.html')
def editor():
    meta = {'title': u'知维图在线编辑 -- 互联网学习实验室',
            'description': u'知维图在线编辑器，用于编写markdown格式教程，实时刷新',
            'keywords': u'zhimind mindmap 教程'}
    source = u"Title: 标题\nslug: your-title-in-english\n" + \
             "tags: tag1 tag2 tag3 用空格隔开\nsummary: 描述\nType: tutorial"
    return render_template('zhimindEditor.html', source=source, meta=meta)


@tutorial_page.route('/editor/<link>')
@login_required
def edit_online(link):
    content = ""
    try:
        tutorial = Tutorial.query.get(link)
        # name = tutorial.get_title()

        if tutorial and tutorial.user_id == g.user.get_id():
            content = tutorial.content
            if not content:
                real_link = '%s?v=%d' % (tutorial.get_url(), random.randint(0, 10000))
                # app.logger.debug(real_link)
                response, content, slug, article_type = md_qa_parse(real_link)
                update_content(tutorial, content, slug, article_type)
    except NoResultFound:
        app.logger.debug(traceback.print_exc())

    meta = {'title': u'知维图在线编辑 -- 互联网学习实验室',
            'description': u'知维图在线编辑器，用于编写markdown格式教程，实时刷新',
            'keywords': u'zhimind mindmap 教程'}

    return render_template('zhimindEditor.html', source=content, meta=meta)


@tutorial_page.route('/tutorial/<link>')
def get_tutorial(link):
    try:
        tutorial = Tutorial.query.get(link)
        if not tutorial:
            tutorial = Tutorial.query.filter_by(slug=link).one_or_none()
    except NoResultFound:
        tutorial = None

    if not tutorial:
        abort(404)
    name = tutorial.get_title()
    meta = gen_meta_for_tp(name, app.redis.get(link))

    tid = tutorial.get_id()
    if link != tid:
        link = tid

    return render_template('tutorial.html', link=link, name=name,
                           cloudjs=random.random() if os.environ.get(
                               "LOAD_JS_CLOUD", 0) else 0,
                           meta=meta)


@tutorial_page.route('/convert/<link>')
def convert(link):
    response = {'status': False}
    link, name = get_real_tid(link)
    if not link:
        response['info'] = u'没有找到'
        return json.dumps(response, ensure_ascii=False)
    entity = app.redis.get(link)

    if entity is None or not eval(entity)['response']:
        try:
            tutorial = Tutorial.query.get(link)
            if not tutorial:
                tutorial = Tutorial.query.filter_by(slug=link).one_or_none()

            if tutorial.content:
                content = tutorial.content
                response, t2, article_type = qa_parse(content)
            else:
                real_link = tutorial.get_url()
                if real_link:
                    response, t, t2, article_type = md_qa_parse(real_link)
                    update_content(tutorial, t, t2, article_type)

            app.redis.set(link, response)
        except:
            app.logger.debug(traceback.print_exc())
            return json.dumps(response, ensure_ascii=False)

    entity = eval(app.redis.get(link))

    session[link] = {'answer': entity['answer'],
                     'comment': entity['comment']}
    response['content'] = entity['response']
    response['status'] = True
    return json.dumps(response, ensure_ascii=False)


@tutorial_page.route('/newtutorial', methods=['POST'])
@tutorial_page.route('/newpractice', methods=['POST'])
@login_required
def create_tutorial():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'status': False,
                           'error': u'用户操作太过频繁,请稍候再试'},
                          ensure_ascii=False)

    title = request.json.get('title')
    url = request.json.get('url')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(url=url, user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    path = request.path
    qtype = "tutorial"
    if 'practice' in path:
        qtype = 'practice'

    g.user.last_edit = now

    if tutorial is None:
        tutorial = Tutorial(title, url, qtype)
        tutorial.user_id = g.user.get_id()
        db.session.add(tutorial)
        db.session.commit()

    ret['error'] = 'success'
    ret['uuid'] = tutorial.get_id()

    return json.dumps(ret, ensure_ascii=False)


def save_content(json_data, user):
    now = datetime.now()
    tutorial_id = json_data.get('id')
    content = json_data.get('content')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(id=tutorial_id,
                                            user_id=user.get_id()).one_or_none()
        if not tutorial and tutorial_id:
            return {'error': tutorial_id + ' not exists'}
    except MultipleResultsFound:
        return ret

    title, tags, summary, slug, article_type = meta_parse(content)
    if tutorial is None:
        slug_tutor = Tutorial.query.filter_by(slug=slug,
                                              user_id=user.get_id()
                                              ).one_or_none()
        if slug_tutor:
            if slug_tutor.title != title:
                return {'error': slug + u'已存在, 且标题不同，"%s"' % slug_tutor.title}
            else:
                user.last_edit = now
                slug_tutor.title = title
                update_content(slug_tutor, content, slug, article_type)
                tutorial = slug_tutor
                ret['id'] = tutorial.get_id()
        else:
            tutorial = Tutorial(title, '', name=article_type)
            tutorial.user_id = user.get_id()
            db.session.add(tutorial)
            user.last_edit = now
            update_content(tutorial, content, slug, article_type)
            db.session.commit()
            ret['id'] = tutorial.get_id()
    else:
        user.last_edit = now
        tutorial.title = title
        update_content(tutorial, content, slug, article_type)

    response, slug, article_type = qa_parse(content)
    app.redis.set(tutorial.get_id(), response)
    session[tutorial_id] = {'answer': response['answer'],
                            'comment': response['comment']}
    ret['error'] = 'success'
    return ret


@tutorial_page.route('/save_tutorial', methods=['POST'])
@login_required
def save_tutorial():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'error': u'用户上次操作在一分钟之内，太过频繁'},
                          ensure_ascii=False)

    ret = save_content(request.json, g.user)
    return json.dumps(ret, ensure_ascii=False)


@tutorial_page.route('/editTutorial', methods=['POST'])
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
    except MultipleResultsFound:
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


@tutorial_page.route('/syncTutorial', methods=['POST'])
@login_required
def sync_tutorial():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'error': u'用户上次操作在一分钟之内，太过频繁'},
                          ensure_ascii=False)

    tutorial_id = request.json.get('id')

    ret = {'error': u'重复数据异常'}
    try:
        tutorial = Tutorial.query.filter_by(id=tutorial_id,
                                            user_id=g.user.get_id()).one_or_none()
        if not tutorial:
            return json.dumps({'error': tutorial_id + ' not exists'})
    except MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    import random

    real_link = '%s?v=%d' % (tutorial.get_url(), random.randint(0, 10000))
    # app.logger.debug(real_link)
    response, content, slug, article_type = md_qa_parse(real_link)
    # for s in response['answer']:
    #    app.logger.debug(' '.join(s))

    session[tutorial_id] = {'answer': response['answer'],
                            'comment': response['comment']}
    app.redis.set(tutorial_id, response)
    g.user.last_edit = now
    update_content(tutorial, content, slug, article_type)

    ret['error'] = 'success'
    return json.dumps(ret, ensure_ascii=False)


@tutorial_page.route('/deleteTutorial', methods=['POST'])
@login_required
def delete_tutorial():
    tutorial_id = request.json.get('id')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(id=tutorial_id,
                                            user_id=g.user.get_id()).one_or_none()
        if not tutorial:
            return json.dumps({'error': tutorial_id + ' not exists'})
    except MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    try:
        db.session.delete(tutorial)
        db.session.commit()
    except:
        return json.dumps({'error': u'数据库更新异常'}, ensure_ascii=False)

    ret['error'] = 'success'
    return json.dumps(ret, ensure_ascii=False)


@tutorial_page.route('/save', methods=['POST'])
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
    except MultipleResultsFound:
        return u'重复数据异常'

    if mindmap is None:
        new_map = MindMap(title, data)
        new_map.user_id = g.user.get_id()
        new_map.last_edit = now
        db.session.add(new_map)
        g.user.last_edit = now
        db.session.commit()
        return u'成功添加新的导图'
    else:
        mindmap.map = data
        mindmap.last_edit = now
        g.user.last_edit = now
        db.session.commit()
        return u'成功更新导图'


def update_content(tutorial, content, slug, article_type):
    try:
        tutorial.content = content
        db.session.commit()
    except:
        app.logger.debug(traceback.print_exc())

    try:
        if slug:
            tutorial.slug = slug
            db.session.commit()
    except:
        app.logger.debug("slug %s repeat" % slug)

    try:
        if article_type:
            tutorial.type = article_type
            db.session.commit()
    except:
        app.logger.debug("article type %s update error" % article_type)


@tutorial_page.route('/gewu.html')
def gewu():
    link = "gewu-learning-methods-template"
    name = "格物学习法"
    meta = {'title': u'格物君 格物以致知。知维图互联网学习实验室',
            'description': u'格物君--',
            'keywords': u'格物致知, 费曼技巧, 思维导图, 启发式学习, 智能学习, 在线教育'}
    return render_template('gewu.html', link=link, name=name,
                           meta=meta)


@tutorial_page.route('/search')
@tutorial_page.route('/search.html')
def search_page():
    meta = {'title': u'知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('search.html', meta=meta)


@tutorial_page.route('/tipuesearch_content.json')
def search_q():
    query = [{'title': e.title, 'url': '/' + e.type + '/'+e.id,
              'text': qa_parse(e.content)[0]['response'], 'tags': ''}
             for e in db.session.query(Tutorial) if e.content]
    return json.dumps({'pages': query}, ensure_ascii=False)


@app.route('/uploadCodeBlock', methods=['POST'])
@jwt_required
def uploadCodeBlock():
    user_id = get_jwt_identity()
    app.logger.info(user_id)
    current_user = User.query.get(user_id)
    now = datetime.now()
    response = {'status': False, "error": u'用户操作太过频繁,请稍候再试',
                "msg": u'用户操作太过频繁,请稍候再试',
                "err_code": 1}
    if not current_user.check_frequence(now):
        return json.dumps(response, ensure_ascii=False)
    current_user.last_edit = now
    ret = save_content(request.json, current_user)
    return json.dumps(ret, ensure_ascii=False)


@app.route('/codeBlock', methods=['GET'])
def codeBlock():
    # @jwt_required
    # current_user = get_jwt_identity()
    # now = datetime.now()
    # response = {'status': False, "error": u'用户操作太过频繁,请稍候再试',
    #             "msg": u'用户操作太过频繁,请稍候再试',
    #             "err_code": 1}
    # if not g.user.check_frequence(now):
    #     return json.dumps(response, ensure_ascii=False)
    # g.user.last_edit = now
    keyword = request.args.get('keyword', "神经,网络")
    keyword = ','.join(keyword.split())
    tutors = Tutorial.query.msearch(keyword, fields=['title'], limit=20).all()
    response = {"error": "error, not find any one", "msg": "error, not find any one",
                "err_code": 1}
    if not tutors:
        return json.dumps(response, ensure_ascii=False)
    response = []
    for t in tutors:
        response.append({'title': t.title, 'content': t.content, 'url': t.slug})

    return json.dumps(response, ensure_ascii=False)


@app.route('/ksearch', methods=['GET'])
@login_required
def knowledge_search():

    keyword = request.args.get('keyword', "神经,网络")
    keyword = ','.join(keyword.split())
    tutors = Tutorial.query.msearch(keyword, fields=['title'], limit=20).all()
    meta = {'title': u'知维图知识搜索 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育 知识搜索'}
    return render_template("knowledge_search.html", meta=meta,
                           tutorials=tutors)
