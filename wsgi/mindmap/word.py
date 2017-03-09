# -*- coding:utf-8 -*-

from flask import render_template

from mindmap import app


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
