#coding=utf-8 
import re
import json
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
        s2 = s2.replace(' ', '')
        if s2 == answer:
            return True
        else:
            app.logger.debug('%s and %s matrix are not equal' % (s2, answer))
            return False
            #return u'答案不匹配'

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
            return u'%s 式子不符合格式' % s2

        if input_answer != correct_answer:
            app.logger.debug('%s and %s are not equal' % (s1, s2))
            return False
        #return "%s is not right" % s2

    return True


def parse_answer(line, p):
    obj = re.findall(p, line)
    if not obj:
        return None
    return obj[0].split("@")


def parse_comment(line, p):
    obj = re.findall(p, line)
    if not obj:
        return None
    lists = obj[0].split("#")
    for l in lists:
        if l.startswith('"'):
            l = json.loads(l)

    return lists


def md_qa_parse(real_link):
    qaparts = {}
    response = ''
    quiz_count = 0
    answers = []
    comments = []

    block_pattern = re.compile('{%(\w*|[^%{}@]*@[^%]*)%}', re.M)
    inline_pattern = re.compile('{%(\w*|[^%{}@]*@[^%]*)%}')
    r = requests.get(real_link)

    if not r.ok:
        return {'response': False, 'info': real_link + u' not exists'}

    if 'content-length' in r.headers and \
                    int(r.headers['content-length']) > 8 * 5000 * 1024 * 3:
        return {'response': False, 'info': real_link + u' 太长'}

    line_count = 0
    block_flag = False

    for line in r.iter_lines():

        line_count += 1

        if block_flag:

            temp1 = parse_answer(line, '@([^#]*)')
            temp2 = parse_comment(line, '#([^%]*)')
            if temp1:
                answer.append(temp1)
                continue
            elif temp2:
                comment.append(temp2)
            elif line.find("%}") >= 0:
                if len(answer) == 1:
                    answer = answer[0]
                if len(comment) == 1:
                    comment = comment[0]
                answers.append(answer)
                comments.append(comment)
                block_flag = False
                response += line
            else:
                response += line
            continue

        if line_count > 5000:
            return {'response': False, 'info': real_link + u' 太长, 超过5000行'}

        if not line.startswith("{%"):
            response += line + '\n'
            continue

        lists = re.findall('{%(\w*|[^%{}@]*@[^%]*)%}', line)
        if lists:
            answer = parse_answer(line, '@([^#]*)')
            answers.append(answer)
            comment = parse_comment(line, '#([^%]*)')
            comments.append(comment)
            response += line[:line.find("@")] + '%}\n'
        else:
            answer = []
            comment = []
            if line.find("@") < 0:
                response += line + "\n"
            else:
                response += line[:line.find("@")] + "\n"
            block_flag = True

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
