# -*- coding:utf-8 -*-

import traceback
from datetime import datetime

import sqlalchemy
from sqlalchemy import desc
from sqlalchemy.orm.exc import NoResultFound, MultipleResultsFound

from flask import request, flash, url_for, redirect, render_template, g, \
    session, json, abort

from flask_login import LoginManager, current_user, logout_user, \
    login_user, login_required

from mindmap import app, db, login_manager

from models import *

from forms import *

from validation import *
from qa_parser import *
from checker import *
from utility import *


@app.route('/')
@app.route('/index')
@app.route('/index.html')
def index():
    if g.user is None or not g.user.is_authenticated:
        return recommendlist()
    else:
        return get_user(g.user.get_name())


@app.route('/introMap.html')
def intro_map():
    meta = {'title': u'知维图 -- 互联网学习实验室', 'description': u'知维图思维导图示例',
            'keywords': u'zhimind mindmap 思维导图'}
    return render_template('introMap.html', meta=meta)


@app.route('/editor.html')
def editor():
    meta = {'title': u'知维图在线编辑 -- 互联网学习实验室',
            'description': u'知维图在线编辑器，用于编写markdown格式教程，实时刷新',
            'keywords': u'zhimind mindmap 教程'}
    source = u"Title: 标题\nslug: your-title-in-english\n" + \
             "tags: tag1 tag2 tag3 用空格隔开\nsummary: 描述"
    return render_template('zhimindEditor.html', source=source, meta=meta)


@app.route('/editor/<link>')
@login_required
def edit_online(link):
    content = ""
    try:
        tutorial = Tutorial.query.get(link)
        name = tutorial.get_title()

        if tutorial and tutorial.user_id == g.user.get_id():
            content = tutorial.content
            if not content:
                real_link = '%s?v=%d' % (tutorial.get_url(), random.randint(0, 10000))
                # app.logger.debug(real_link)
                response, content, slug = md_qa_parse(real_link)
                update_content(tutorial, content, slug)
    except NoResultFound:
        app.logger.debug(traceback.print_exc())

    meta = {'title': u'知维图在线编辑 -- 互联网学习实验室',
            'description': u'知维图在线编辑器，用于编写markdown格式教程，实时刷新',
            'keywords': u'zhimind mindmap 教程'}

    return render_template('zhimindEditor.html', source=content, meta=meta)


@app.route('/android')
@app.route('/android.html')
def android():
    meta = {'title': u'知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('android.html', mapid="", meta=meta)


@app.route('/android/<mapid>', methods=['GET'])
def android_map(mapid):
    try:
        mindmap = MindMap.query.get(mapid)
        name = mindmap.title
    except NoResultFound:
        name = ""

    meta = {'title': u'%s 知维图 -- 互联网学习实验室' % name,
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind %s 思维导图 启发式学习 智能学习 在线教育' % name}
    return render_template('android.html', mapid=mapid, meta=meta)


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


@app.route('/tutorial/<link>')
def get_tutorial(link):
    try:
        tutorial = Tutorial.query.get(link)
        if not tutorial:
            tutorial = Tutorial.query.filter_by(slug=link).one_or_none()
    except NoResultFound:
        name = ""

    if not tutorial:
        abort(404)
    name = tutorial.get_title()
    meta = gen_meta_for_tp(name, app.redis.get(link))

    tid = tutorial.get_id()
    if link != tid:
        link = tid

    return render_template('tutorial.html', link=link, name=name,
                           meta=meta)


@app.route('/convert/<link>')
def convert(link):
    response = {'status': False}
    link = get_real_tid(Tutorial, link)
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
                response, t2 = qa_parse(content)
            else:
                real_link = tutorial.get_url()
                if real_link:
                    response, t, t2 = md_qa_parse(real_link)
                    update_content(tutorial, t, t2)

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


@app.route('/checkChoice', methods=["POST"])
def checkChoice():
    response = {'status': False}
    no, tid, expression = validate_check_para(request.json, Tutorial)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    user_choose = expression.split("@")
    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    # app.logger.debug(user_choose[0])
    # app.logger.debug(answers[0])

    s1 = set(user_choose)
    s2 = set(answers)

    match = 0
    f = True

    for e1 in s1:
        flag = False
        for e2 in s2:
            if e1 == e2:
                flag = True
                match += 1
                break

        if flag:
            continue

        f = False
        for e in comments[0]:
            if e in e1:
                response['comment'] = comments[0][e]
                return json.dumps(response, ensure_ascii=False)

    if not f or match != len(s2):
        response['comment'] = comments[1]
        return json.dumps(response, ensure_ascii=False)

    response['status'] = True
    return json.dumps(response, ensure_ascii=False)


@app.route('/checkTextAnswer', methods=["POST"])
def checkAnswer():
    response = {'status': False}
    no, tid, expression = validate_check_para(request.json, Tutorial)
    app.logger.debug('%s %s %s' % (str(no), str(tid), str(expression)))
    app.logger.debug(no is not None)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    if not answers or len(answers) != len(expression):
        response['info'] = u'有些空没有填?'
        return json.dumps(response)

    for i in range(len(answers)):
        user = expression[i].strip()
        f, r = checkText(user, answers[i])
        if r in comments[0]:
            response['comment'] = comments[0][r]
        if not f:
            for e in comments[0]:
                if e in user:
                    response['comment'] = comments[0][e]
                    return json.dumps(response, ensure_ascii=False)
            if 'comment' not in response:
                response['comment'] = comments[1]
            return json.dumps(response)

    response['status'] = True
    return json.dumps(response)


@app.route('/cmp_math', methods=["POST"])
def cmp_math():
    response = {'status': False}
    no, tid, expression = validate_check_para(request.json, Tutorial)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    user_choose = expression.split("@")

    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    if not answers or len(answers) != len(expression):
        return json.dumps(response)

    for i in range(len(answers)):
        info = checkCmpExpression(answers[i], expression[i])
        # app.logger.debug(info)
        if info != True:
            response['info'] = info
            if 'comment' not in response:
                response['comment'] = comments[1]
            break
    response['status'] = True
    return json.dumps(response, ensure_ascii=False)


@app.route('/checkProcess', methods=["POST"])
def checkProcess():
    response = {'status': False}
    no, tid, l = validate_check_para(request.json, Tutorial)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    result = check_process(l, answers, comments)
    response['status'] = result[0]
    response['options'] = result[1]
    response['match'] = result[2]
    if result[0] and len(l) > 1 and len(l[1]) + 2 == len(answers):
        response['finish'] = True
    return json.dumps(response, ensure_ascii=False)


@app.route('/practice/<link>')
def program_practice(link):
    base_link = '/'
    name = ''
    try:
        tutorial = Tutorial.query.get(link)
        if not tutorial:
            tutorial = Tutorial.query.filter_by(slug=link).one_or_none()
        real_link = tutorial.get_url()
        base_link = '/'.join(real_link.split('/')[:-1])
        name = tutorial.get_title()
        tid = tutorial.get_id()
        if link != tid:
            link = tid
    except NoResultFound:
        app.logger.debug(traceback.print_exc())

    meta = gen_meta_for_tp(name, app.redis.get(link))
    return render_template('practice.html', link=link, base=base_link, name=name, meta=meta)


@app.route('/newmap')
def new_map():
    meta = {'title': u'创建新导图 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind mindmap 思维导图 启发式学习 智能学习 在线教育'}
    return render_template('map.html', mapid='null', meta=meta)


@app.route('/map/<mapid>', methods=['GET'])
def map_page(mapid):
    if not mapid:
        return redirect(url_for('index'))
    try:
        mindmap = MindMap.query.get(mapid)
        name = mindmap.title
    except:
        name = ""
    meta = {'title': u'%s 知维图 -- 互联网学习实验室' % name,
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind %s 思维导图 启发式学习 智能学习 在线教育' % name}
    return render_template('map.html', mapid=mapid, meta=meta)


@app.route('/loadmap/<mapid>', methods=['GET'])
def load_map(mapid):
    if mapid == 'null':
        return json.dumps({'name': 'root'})

    ret_code = {'error': 'not exist'}

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
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'status': False,
                           'error': u'用户上次操作在一分钟之内，太过频繁'},
                          ensure_ascii=False)
    name = request.json.get('name', None)
    mapid = request.json.get('mapid', None)
    tutorid = request.json.get('tutorid', None)
    parent = request.json.get('parent', None)

    ret = {'status': False}
    if name and mapid and tutorid:
        try:
            result = EntryMastery.query.filter_by(user_id=g.user.get_id(),
                                                  mindmap_id=mapid, name=name, tutor_id=
                                                  tutorid).one_or_none()
        except MultipleResultsFound:
            ret['error'] = u'搜索到多条数据，请联系管理员'
            return json.dumps(ret, ensure_ascii=False)

        if result is None:
            entry = EntryMastery(name, parent)
            entry.user_id = g.user.get_id()
            entry.mindmap_id = mapid
            entry.tutor_id = tutorid
            g.user.last_edit = now
            db.session.add(entry)
            db.session.commit()

    ret['status'] = True

    return json.dumps(ret, ensure_ascii=False)


@app.route('/update_mastery', methods=['POST'])
@login_required
def update_entry_master():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'status': False,
                           'error': u'用户上次操作在一分钟之内，太过频繁'},
                          ensure_ascii=False)

    ret = {'status': False}
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
    g.user.last_edit = now
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

    ret['status'] = True
    return json.dumps(ret, ensure_ascii=False)


@app.route('/newtutorial', methods=['POST'])
@app.route('/newpractice', methods=['POST'])
@login_required
def create_tutorial():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'status': False,
                           'error': u'用户上次操作在一分钟之内，太过频繁'},
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


@app.route('/save_tutorial', methods=['POST'])
@login_required
def save_tutorial():
    now = datetime.now()
    if not g.user.check_frequence(now):
        return json.dumps({'error': u'用户上次操作在一分钟之内，太过频繁'},
                          ensure_ascii=False)

    tutorial_id = request.json.get('id')
    content = request.json.get('content')

    ret = {'error': u'重复数据异常'}

    try:
        tutorial = Tutorial.query.filter_by(id=tutorial_id,
                                            user_id=g.user.get_id()).one_or_none()
        if not tutorial and tutorial_id:
            return json.dumps({'error': tutorial_id + ' not exists'})
    except MultipleResultsFound:
        return json.dumps(ret, ensure_ascii=False)

    title, tags, summary, slug = meta_parse(content)
    if tutorial is None:
        tutorial = Tutorial(title, "")
        tutorial.user_id = g.user.get_id()
        db.session.add(tutorial)
        g.user.last_edit = now
        update_content(tutorial, content, slug)
        db.session.commit()
        ret['id'] = tutorial.get_id()
    else:
        g.user.last_edit = now
        update_content(tutorial, content, slug)

    response, slug = qa_parse(content)
    app.redis.set(tutorial.get_id(), response)
    ret['error'] = 'success'
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


@app.route('/syncTutorial', methods=['POST'])
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
    response, content, slug = md_qa_parse(real_link)
    # for s in response['answer']:
    #    app.logger.debug(' '.join(s))

    session[tutorial_id] = {'answer': response['answer'],
                            'comment': response['comment']}
    app.redis.set(tutorial_id, response)
    g.user.last_edit = now
    update_content(tutorial, content, slug)

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
    except MultipleResultsFound:
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
    except MultipleResultsFound:
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

        if form.verification_code.data == code_text:
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


@app.route('/getWords/<book>', methods=["GET"])
@login_required
def getWords(book):
    try:
        wordDict = ReciteWord.query.filter_by(book_name=book.strip(), user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return u'重复数据异常'
    data = wordDict.get_data() if wordDict else {}
    return json.dumps(data, ensure_ascii=False)


@app.route('/putWords', methods=["POST"])
@login_required
def putWords():
    book = request.json.get('book', None)
    data = request.json.get('data', None)

    if not book or not data:
        return json.dumps({})

    try:
        word_dict = ReciteWord.query.filter_by(book_name=book.strip(), user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return json.dumps({'error': u'重复数据异常'})

    if word_dict is None:
        new_word_user = ReciteWord(g.user.get_id(), book.strip(), data)
        db.session.add(new_word_user)
        db.session.commit()
    else:
        stored_data = word_dict.data
        new_data = data
        for k in stored_data:
            if k not in new_data:
                new_data[k] = {}
            for e in stored_data[k]:
                if e not in new_data[k]:
                    new_data[k][e] = stored_data[k][e]

        word_dict.data = new_data
        db.session.commit()

    return json.dumps({})


@app.route('/reciteWord.html')
def reciteWord():
    import random
    import requests
    real_link = "http://7xt8es.com1.z0.glb.clouddn.com/naodong/word/books.txt?v=" \
                + str(random.randint(1, 10000))
    # real_link = "http://localhost:4321/books.txt"
    r = requests.get(real_link)
    books = []
    for line in r.iter_lines():
        if not line:
            continue
        items = line.split()
        if len(items) == 2:
            name, link = items
            num = ""
        else:
            name, link, num = items
        # app.logger.debug(line)
        books.append({'name': name, 'link': link, 'num': num})
    # app.logger.debug(books)
    meta = {'title': u'脑洞背单词 知维图 -- 互联网学习实验室',
            'description': u'脑洞计划之背单词， 联想记忆，词根词缀， 例句',
            'keywords': u'zhimind 单词 智能学习 词根词缀 联想记忆'}
    return render_template('reciteWord.html', books=books, meta=meta)


@login_manager.user_loader
def load_user(id):
    return User.query.get(id)


@app.before_request
def before_request():
    g.user = current_user


def update_content(tutorial, content, slug):
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


@app.errorhandler(404)
def page_not_found(error):
    meta = {'title': u'页面不存在 知维图 -- 互联网学习实验室',
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind 启发式学习 智能学习 在线教育'}
    return render_template('404.html', meta=meta)


