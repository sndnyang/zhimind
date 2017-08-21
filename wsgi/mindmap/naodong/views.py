# -*- coding:utf-8 -*-
import os
import json
import copy

from flask import render_template, g, request, Blueprint
from flask_login import login_required
from sqlalchemy.orm.exc import MultipleResultsFound

from models import ReciteWord
from mindmap import db, app

recite_word_page = Blueprint('naodong_word', __name__,
                             template_folder=os.path.join(
                                 os.path.dirname(__file__), 'templates'),
                             static_folder=os.path.join(
                                 os.path.dirname(__file__), "static"))


@recite_word_page.route('/reciteWord.html')
def reciteWord():
    import random
    import requests
    real_link = "http://7xt8es.com1.z0.glb.clouddn.com/naodong/word/books.txt?v="\
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
    return render_template('reciteWord.html', books=books, meta=meta, 
                           cloudjs=random.random()
                           if os.environ.get("LOAD_JS_CLOUD", 0) else 0)


@recite_word_page.route('/getWords/<book>', methods=["GET"])
@login_required
def getWords(book):
    try:
        word_dict = ReciteWord.query.filter_by(book_name='gloss',
                user_id=g.user.get_id()).one_or_none()
        if not word_dict:
            word_dict = ReciteWord.query.filter_by(book_name=book.strip(),
                    user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return json.dumps({'error': u'重复数据异常'}, ensure_ascii=False)
    data = word_dict.get_data() if word_dict else {}
    return json.dumps(data, ensure_ascii=False)


@recite_word_page.route('/putWords', methods=["POST"])
@login_required
def putWords():
    book = request.json.get('book', None)
    data = request.json.get('data', None)

    if not book or not data:
        return json.dumps({'error': u'无书名或无数据'}, ensure_ascii=False)

    try:
        word_dict = ReciteWord.query.filter_by(book_name=book.strip(),
                user_id=g.user.get_id()).one_or_none()
        gloss_dict = ReciteWord.query.filter_by(book_name='gloss',
                user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return json.dumps({'error': u'重复数据异常'}, ensure_ascii=False)

    if word_dict is None:
        new_word_user = ReciteWord(g.user.get_id(), book.strip(), data)
        db.session.add(new_word_user)
    else:
        newdata = copy.deepcopy(word_dict.get_data())
        newdata.update(data)
        word_dict.data = newdata
    if gloss_dict is None:
        new_word_gloss = ReciteWord(g.user.get_id(), 'gloss', data)
        db.session.add(new_word_gloss)
    else:
        newdata = copy.deepcopy(gloss_dict.get_data())
        newdata.update(data)
        gloss_dict.data = newdata
    db.session.commit()
    return json.dumps({})
