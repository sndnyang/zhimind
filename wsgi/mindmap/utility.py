#coding=utf-8
import random
import re
import json
import requests

from sympy import simplify_logic


def is_expression_cmp(s):
    for e in ['=', '>', '<']:
        if e in s:
            return True
    return False


def check_clause(text, s, clist):

    for sub in s.split("|"):
        match = []
        # print 'or sub %s' % sub
        for p in sub.split("&"):
            if not p:
                return False, u'作者编写的参考答案有bug，请联系管理员'
            
            # print 'and sub %s' % sub,
            if p.startswith('part-'):
                try:
                    i = int(p[5:])
                    flag, item = check_clause(text, clist[i], clist)
                    if not flag:
                        break
                    match.append('(%s)'%item)
                except ValueError:
                    if p not in text:
                        break
                    match.append(p)
            else:
                if p not in text:
                    break
                match.append(p)
        else:
            # print 'match', '&'.join(match)
            return True, '&'.join(match)
    else:
        return False, None
        


def checkText(text, answer):
    b = re.findall('(\([^)]+\))', answer)
    c = 0
    s = answer
    for e in b:
        s = s.replace(e, 'part-'+str(c))
        b[c] = e[1:-1]
        c += 1
    return check_clause(text, s, b)



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
            return False

    if is_expression_cmp(s1):
        return u'代数式方可简化，但不是方程，不能带=><'
    else:

        try:
            correct_answer = simplify_logic(s1)
        except:
            return u'作者编写的参考答案有bug，请联系管理员'

        try:
            input_answer = simplify_logic(s2)
        except:
            return u'你输入的代数式 %s ' % s2

        if input_answer != correct_answer:
            return False

    return True


def find_right_next(s, i, n, char):
    if i == len(s):
        return i

    if s[i] == '{':
        return find_right_next(s, i + 1, n + 1, char)
    elif s[i] in '%' + char and n == 0:
        return i
    elif s[i] == '}' and n > 0:
        return find_right_next(s, i + 1, n - 1, char)
    else:
        return find_right_next(s, i + 1, n, char)


def finite_status_machine(c, char):
    start = 0
    end = 0
    lists = []
    while start < len(c)-2:
        end = find_right_next(c, start, 0, char)
        lists.append(c[start:end])
        start = end+1
    return lists


def parse_answer(line, p, quiz_type):
    """
    1. 需要在js里判断':'和'@' 中间不存在 ','，一个答案只写一次，独占一空
    1. 如果存在两个 : 需要在js里判断中间存在 ',' 而不是 '，'
    """
    obj = re.findall(p, line, re.M)
    if not obj:
        return None

    result = None
    lists = [e.replace('\n', '').replace('\r', '') for e in obj[0].split(p[0])]
    options = []
    for l in lists:
        if quiz_type != 'process':
            break

        t = [e.replace('\n', '').replace('\r', '') for e in l.split(';')]
        lt = len(t)
        answer_map = {}
        if lt == 1:
            answer_map  = {t[0]: ([], '')}
        if lt == 2:
            pre = t[0].split(',')
            if t[1][0] == '$' or t[1][0] == '!' or t[1][0] == '`':
                answer_map = {t[0]: ([], t[1])}
                options.append(t[1])
            else:
                answer_map = {t[0]: (t[1].split(','), '')}
        if lt == 3:
            answer_map  = {t[0]: (t[1].split(','), t[2])}
            options.append(t[2])

        if not result:
            result = answer_map
            result['options'] = options
            continue

        for e in answer_map:
            result[e] = answer_map[e]

    if not result:
        result = lists

    return result


def parse_comment(c):
    """
    如果存在两个 : 需要在js里判断中间存在 ',' 而不是 '，'
    """
    lists = finite_status_machine(c, '#')
    result = [{},[]]
    for l in lists:
        if ':' not in l:
            result[1].append(l)
            continue

        t = []
        for s in finite_status_machine(l, '#,'):
            t.append(':'.join(['"%s"' % e.replace('\n', '').replace('\r', '') for e in s.split(':',1)]))

        l = json.loads('{%s}' % ','.join(t))

        for e in l:
            result[0][e] = l[e]

    return result


def merge_all(items, item):
    if not items:
        return item
    if type(items) != type(item):
        return items

    if isinstance(items, list):
        for e in item: 
            items.append(e)
    elif isinstance(items, dict):
        for e in item:
            if e in items and isinstance(items[e], list):
                for l in item[e]:
                    items[e].append(l)
            else:
                items[e] = item[e]

    return items


def parse_quiz(content, quiz_type):
    answer = parse_answer(content, '@([^#]*)', quiz_type)
    comment = parse_comment(content[content.find('#')+1:])
    return answer, comment


def qa_parse(content):
    qa_parts = {}

    answers = []
    comments = []

    try:
        slug = re.search('\nsummary:\s*(.+)', content).group(1)
    except AttributeError:
        slug = ''

    def extract(matched):
        s = matched.group()
        quiz_type = re.search('^{%(\w+)|', s, re.M).group(1)
        answer, comment = parse_quiz(s, quiz_type)
        answers.append(answer)
        comments.append(comment)
        s = s[:s.find('@')] + '%}'
        return s

    start = content.find("{%")
    lists = []
    while start < len(content):
        end = find_right_next(content, start, 0, '\n')
        s = content[start:end]
        lists.append(s)
        quiz_type = re.search('^{%(\w+)|', s, re.M).group(1)
        answer, comment = parse_quiz(s, quiz_type)
        answers.append(answer)
        comments.append(comment)
        start = content.find("{%", end)
        if start <= 0:
            break

    for s in lists:
        content = content.replace(s, s[:s.find('@')].strip() + '%}\n')

    response = content
    #block_pattern = re.compile('{%(\w*|[^%{}@]*@[^%]*)%}', re.M)
    #response = re.sub(block_pattern, extract, content)

    qa_parts['response'] = response
    qa_parts['answer'] = answers
    qa_parts['comment'] = comments

    return qa_parts, slug


def md_qa_parse(real_link):

    try:
        r = requests.get(real_link)
    except requests.ConnectionError:
        return {'response': False, 'info': real_link + u'不存在'}, "", None

    if not r.ok:
        return {'response': False, 'info': real_link + u'不存在'}, "", None

    if 'content-length' in r.headers and \
                    int(r.headers['content-length']) > 8 * 5000 * 1024 * 3:
        return {'response': False, 'info': real_link + u' 太长'}, "", None

    content = r.content
    qa_parts, slug = qa_parse(content)

    return qa_parts, content, slug


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


def meta_parse(content):
    title = ''
    tags = ''
    summary = ''
    slug = ''
    meta_lines = content.split("\n")[:10]
    for line in meta_lines:
        l = line.lower()
        if not l.find('summary'):
            summary = l.split(":")[1].strip()
        elif not l.find('tags'):
            tags = ' '.join(l.split(":")[1].split(","))
        elif not l.find('title'):
            title = l.split(":")[1].strip()
        elif not l.find('slug'):
            slug = l.split(":")[1].strip()

    return title, tags, summary, slug
