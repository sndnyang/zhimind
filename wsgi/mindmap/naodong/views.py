# -*- coding:utf-8 -*-
import os
import json
import random

from flask import render_template, Blueprint, g, request
from flask_login import login_required
from sqlalchemy.orm.exc import MultipleResultsFound

from models import ReciteWord
from mindmap import app
from . import naodong_word

@naodong_word.route('/reciteWord.html')
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
    return render_template('reciteWord.html', books=books, meta=meta, 
            cloudjs = random.random() if os.environ.get("LOAD_JS_CLOUD", 0) else 0)


@naodong_word.route('/getWords/<book>', methods=["GET"])
@login_required
def getWords(book):
    try:
        wordDict = ReciteWord.query.filter_by(book_name=book.strip(), user_id=g.user.get_id()).one_or_none()
    except MultipleResultsFound:
        return u'重复数据异常'
    data = wordDict.get_data() if wordDict else {}
    return json.dumps(data, ensure_ascii=False)


@naodong_word.route('/putWords', methods=["POST"])
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


