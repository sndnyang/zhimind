# -*- coding:utf-8 -*-
import os

from flask import request, g, session, json, Blueprint

from mindmap import app
from utility import *

from qa_parser import *
from AnswerChecker import *

answer_checker = Blueprint('answer_checker', __name__,
                           template_folder=os.path.join(
                               os.path.dirname(__file__), 'templates'))


@answer_checker.route('/checkChoice', methods=["POST"])
def checkChoice():
    response = {'status': False}
    no, tid, expression, name = validate_check_para(request.json)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    user_choose = expression.split("@")
    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    if g.user is None or not g.user.is_authenticated:
        user = request.remote_addr
    else:
        user = g.user.get_name()
    app.logger.info("choice\t%s\t%s:%s\t%s\t%s\t%s" %
                    (user, tid, name, no, expression, '@'.join(answers)))

    if len(answers) == 1 and not answers[0]:
        response['status'] = True
        response['comment'] = '有自己的判断就好了，不是吗？'
        return json.dumps(response, ensure_ascii=False)
    # app.logger.debug(answers)
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
    if '你答对了' in comments[0]:
        response['comment'] = comments[0]['你答对了']
    return json.dumps(response, ensure_ascii=False)


@answer_checker.route('/checkTextAnswer', methods=["POST"])
def checkAnswer():
    response = {'status': False}
    no, tid, expression, name = validate_check_para(request.json)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    if g.user is None or not g.user.is_authenticated:
        user = request.remote_addr
    else:
        user = g.user.get_name()
    temp = '@'.join(answers)
    if not temp:
        temp = "empty"
    app.logger.info("text\t%s\t%s:%s\t%s\t%s\t%s" %
                    (user, tid, name, no, '@'.join(expression), temp))

    if not answers or len(answers) != len(expression):
        response['info'] = u'有些空没有填?'
        return json.dumps(response, ensure_ascii=False)

    for i in range(len(answers)):
        user = expression[i].strip()
        if len(answers[i]) < 5 or answers[i] == "empty" or\
                '&' in answers[i] or '|' in answers[i]:
            f, r = checkText(user, answers[i])
            if r in comments[0]:
                response['comment'] = comments[0][r]
        else:
            t = app.aipNlp.simnet(user, answers[i])['output']['score']
            app.logger.info("similar score\t%s\t%s\t%s" %
                            (user, '@'.join(expression), str(t)))
            f = t > 0.6

        if not f:
            for e in comments[0]:
                if e in user:
                    response['comment'] = comments[0][e]
                    return json.dumps(response, ensure_ascii=False)
            if 'comment' not in response:
                response['comment'] = comments[1]
            return json.dumps(response, ensure_ascii=False)

    response['status'] = True
    if '你答对了' in comments[0]:
        response['comment'] = comments[0]['你答对了']
    return json.dumps(response, ensure_ascii=False)


@answer_checker.route('/cmp_math', methods=["POST"])
def cmp_math():
    response = {'status': False}
    no, tid, expression, name = validate_check_para(request.json)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    if g.user is None or not g.user.is_authenticated:
        user = request.remote_addr
    else:
        user = g.user.get_name()
    app.logger.info("math\t%s\t%s:%s\t%s\t%s\t%s" %
                    (user, tid, name, no, '@'.join(expression), '@'.join(answers)))

    if not answers or len(answers) != len(expression):
        return json.dumps(response, ensure_ascii=False)

    for i in range(len(answers)):
        info = checkCmpExpression(answers[i], expression[i])
        if info is not True:
            response['info'] = info
            if 'comment' not in response:
                response['comment'] = comments[1]
            break
    else:
        response['status'] = True
        if '你答对了' in comments[0]:
            response['comment'] = comments[0]['你答对了']
    return json.dumps(response, ensure_ascii=False)


@answer_checker.route('/checkProcess', methods=["POST"])
def checkProcess():
    response = {'status': False}
    no, tid, l, name = validate_check_para(request.json)
    if no is None:
        return json.dumps(tid, ensure_ascii=False)

    if tid in session:
        answers = session[tid]['answer'][no]
        comments = session[tid]['comment'][no]
    else:
        answers = eval(app.redis.get(tid))['answer'][no]
        comments = eval(app.redis.get(tid))['comment'][no]

    if g.user is None or not g.user.is_authenticated:
        user = request.remote_addr
    else:
        user = g.user.get_name()
    app.logger.info("proc\t%s\t%s\t%s\t%s" % (user, tid, no, '@'.join(l)))

    result = check_process(l, answers, comments)
    response['status'] = result[0]
    response['options'] = result[1]
    response['match'] = result[2]
    if result[0] and (l[0] == 'Q.E.D.' or l[0] == '证毕'):
        response['finish'] = True
    return json.dumps(response, ensure_ascii=False)
