﻿#coding=utf-8 
import re
import md5
import requests

from xml.etree.ElementTree import tostring

from sympy import simplify_logic

from mindmap import app

def isExpressionCmp(s):
    for e in ['=', '>', '<']:
        if e in s:
            return True
    return False

def checkCmpExpression(s1, s2):
    """
    验证 两个式子是否一致
    :param s1: 标准参考答案
    :param s2: 用户输入结果
    :return:
    """
    if ':' in s1:
        answer_type, answer = s1.split(':')
        # 默认添加 : 的都是 矩阵类型的， 因为其他类型的貌似 sympy simplify 能处理
        # 一般矩阵乘法不满足交换律， 所以一般来说， 矩阵的表达式不需要化简
        # 貌似可以去掉空格而不影响式子， 所以处理方式是去掉空格后比较。
        answer = answer.replace(' ', '')
        s1 = s1.replace(' ', '')
        if s2 == answer:
            return None
        else:
            app.logger.debug('%s and %s matrix are not equal' % (s1, answer))
            return u'答案不匹配'

    if isExpressionCmp(s1):
        app.logger.debug(s1 + ' has equation ')
        return u'暂不支持带=><'
    else:

        try:
            correct_answer = simplify_logic(s1)
        except:
            app.logger.debug('answer %s simplify error' % s1)
            return u'参考答案bug 处理错误'
        try:
            input_answer = simplify_logic(s2)
        except:
            app.logger.debug('%s simplify error' % s2)
            return '%s simplify error' % s2

        if input_answer != correct_answer:
            app.logger.debug('%s and %s are not equal' % (s1, s2))
            return "%s is not right" % s2

    return None

def md_qa_parse(real_link):

    qaparts = {}
    response = ''
    quiz_count = 0
    answers = []
    comments = {}
    r = requests.get(real_link)

    if not r.ok:
        return {'response': False, 'info': real_link+u' not exists'}

    if 'content-length' in r.headers and \
        int(r.headers['content-length']) > 8 * 1024 * 1024 * 3:
        return {'response': False, 'info': real_link+u' 太长'}
   
    line_count = 0
    for line in r.iter_lines():
        line_count += 1
        if line_count > 1024:
            return {'response': False, 'info': real_link+u' 太长, 超过1000行'}

        lists = re.findall('{%(\w*|[^%{}@]*@[^%]*)%}', line)
        if not lists:
            response += line+'\n'
            continue

        sterm = lists[0]
        pattern = '([^|]*)\|([^@]*)@([^#]*)'
        parts = re.findall(pattern, sterm)[0]

        question = parts[1]

        response += '<div class="math-container">\n'
        submit = '<br><button onclick="checkQuiz(this, %d)">submit</button><br><br>\n'

        if parts[0] == "radio" or parts[0] == "checkbox":
            quiz_count += 1
            etype = parts[0]
            qparts = question.split('&')
            question = '<p>%s</p>' % qparts[0]
            response +=  question

            template = '<input type="%s" class="quiz" name="quiz" value="%s">'\
                    +'%s</input>'
            for v in qparts[1:]:
                ele = template % (etype, v, v)
                #app.logger.debug(ele)
                response += ele+'<br>'
            response += submit % quiz_count

        elif parts[0] == "text":
            quiz_count += 1
            blank = '<input type="text" class="quiz">'
            question = question.replace('_', blank)
            response += question
            response += submit % quiz_count

        if parts[0] == "formula":
            quiz_count += 1
            blank = '<input type="text" class="quiz formula" '
            blank += 'onkeyup="Preview.Update(this)">\n'
            blank += '<br><div id="MathPreview%d" class="MathPreview"></div>\n' % quiz_count

            question = question.replace('_', '<br>'+blank+'<br>')

            response += question
            response += submit % quiz_count

        if parts[0] == "formula" or parts[0] == "text":
            answers.append(parts[2])
        else:
            tmp = md5.new()
            tmp.update(parts[2])
            encry = tmp.hexdigest()
            answers.append(encry)

        comment_pos = line.find('#')
        if comment_pos:
            comment = re.findall('#([^#]*)', sterm)
            comments[quiz_count] = comment
        response += '</div>\n'

    qaparts['response'] = response
    qaparts['answer'] = answers
    qaparts['comment'] = comments

    return qaparts

def add_mastery_in_json(json, entrys):
    node_map = dict((e.name, (e.parent, e.mastery)) for e in entrys)
    visited = []
    def dfs(node, parent):
        name = node['name']
        if name in node_map:
            if parent == '' or parent == node_map[name][0]:
                node['level'] = node_map[name][1]

        if 'children' not in node:
            return node

        childlevel = 0
        for child in node['children']:
            if child not in visited:
                childnode = dfs(child, name)
                if childnode and 'level' in childnode:
                    childlevel += child['level']

        if childlevel:
            if 'level' not in node:
                node['level'] = 0
            node['level'] += childlevel * 1.0 / len(node['children'])
        return node

    node = dfs(json, '')
