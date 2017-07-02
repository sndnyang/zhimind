# coding=utf-8

from sqlalchemy.orm.exc import NoResultFound

from qa_parser import *
from models import Tutorial


def printDeep(item, deep):
    if isinstance(item, (str, bool, int, float)):
        print ' '*deep, item
    elif isinstance(item, (list, tuple)):
        print ' '*deep, 'a list'
        for e in item:
            if isinstance(e, (str, bool, int, float)):
                print ' '*(deep+4), e
            else:
                printDeep(e, deep+4)
    elif isinstance(item, dict):
        print ' '*deep, 'a dict'
        for e in item:
            print ' '*(deep+4), e, ':', item[e]
            if not isinstance(e, (str, bool, int, float)):
                printDeep(e, deep+4)


def gen_meta_for_tp(name, entity):

    meta = {'title': u'%s 知维图 -- 互联网学习实验室' % name,
            'description': u'知维图--试图实现启发引导式智能在线学习，数学与计算机领域',
            'keywords': u'zhimind %s 思维导图 启发式学习 智能学习 在线教育' % name}

    if not entity:
        return meta

    d = eval(entity)
    if 'response' not in d or not d['response']:
        return meta

    title, tags, summary, slug = meta_parse(d['response'])
    meta['description'] = summary + meta['description']
    meta['keywords'] += tags

    return meta


def validate_check_para(data):
    response = {'status': False}

    no = data.get('id', None)
    if not no:
        return None, response, None
    try:
        no = int(no) - 1
    except ValueError:
        return None, response, None

    expression = data.get('expression', None)
    tid = data.get('url', None)
    if not expression or not tid:
        return None, response, None

    tid, name = get_real_tid(tid)
    if not tid:
        response['info'] = u'url不正确？'
        return None, response, None
    return no, tid, expression, name


def get_real_tid(tid):
    try:
        tutorial = Tutorial.query.get(tid)
        if not tutorial:
            tutorial = Tutorial.query.filter_by(slug=tid).one_or_none()
            if tutorial:
                tid = tutorial.get_id()
            else:
                return None, None
    except NoResultFound:
        return None, None
    return tid, tutorial.get_title()
