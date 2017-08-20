# -*- coding:utf-8 -*-
import os
import json
import random
import requests

from flask import render_template, g, request, Blueprint
from flask_login import login_required
from sqlalchemy.orm.exc import MultipleResultsFound

from models import Episode
from mindmap import db, app

talkerchu_page = Blueprint('talkerchu', __name__,
                           template_folder=os.path.join(
                                 os.path.dirname(__file__), 'templates'),
                           static_folder="static")


@talkerchu_page.route('/index.html')
def talkerchu():
    real_link = "http://7xt8es.com1.z0.glb.clouddn.com/naodong/talkerchu/books.txt?v="\
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
    meta = {'title': u'脱口而出 知维图 -- 互联网学习实验室',
            'description': u'脑洞学英语之脱口说， 联想记忆，词根词缀， 例句',
            'keywords': u'zhimind 口语 智能学习 词根词缀 联想记忆'}
    return render_template('talkerchu.html', books=books, meta=meta, 
                           cloudjs=random.random()
                           if os.environ.get("LOAD_JS_CLOUD", 0) else 0)


@talkerchu_page.route('/catalog/<name>', methods=["GET"])
def catalog(name):
    real_link = "http://7xt8es.com1.z0.glb.clouddn.com/naodong/talkerchu/"\
                 + name + "/catalog.txt?v=" + str(random.randint(1, 10000))
    # real_link = "http://localhost:4321/books.txt"
    r = requests.get(real_link)
    books = []
    for line in r.iter_lines():
        if not line:
            continue
        items = line.split()
        name = items[1:-1]
        link = items[0]
        num = items[-1]
        # app.logger.debug(line)
        books.append({'name': name, 'link': link, 'num': num})
    return json.dumps(books, ensure_ascii=False)


@talkerchu_page.route('/getEpisode/<book>/<no>', methods=["GET"])
@login_required
def getText(book, no):
    try:
        episode = Episode.query.filter_by(name=book.strip(),
                no = int(no), user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return json.dumps({'error': u'重复数据异常'})
    data = episode.get_data() if episode else []
    return json.dumps(data, ensure_ascii=False)


@talkerchu_page.route('/putEpisode', methods=["POST"])
@login_required
def putText():
    book = request.json.get('book', None)
    no = request.json.get('no', None)
    data = request.json.get('data', None)

    if not book or not no or not data:
        return json.dumps({'error': u'无书名或无数据'})

    try:
        episode = Episode.query.filter_by(name=book.strip(),
                no = int(no), user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return json.dumps({'error': u'重复数据异常'})

    if episode is None:
        new_word_user = Episode(g.user.get_id(), book.strip(), int(no), data)
        db.session.add(new_word_user)
    else:
        episode.data = data
    db.session.commit()
    return json.dumps({})
