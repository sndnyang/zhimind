#coding=utf-8 
import re
import json
import requests

from xml.etree.ElementTree import tostring

from sympy import simplify_logic

def isExpressionCmp(s):
    for e in ['=', '>', '<']:
        if e in s:
            return True
    return False


def check_clause(text, s, clist):

    for sub in s.split("|"):
        match = []
        #print 'or sub %s' % sub
        for p in sub.split("&"):
            if not p:
                return False, u'作者编写的参考答案有bug，请联系管理员'
            
            #print 'and sub %s' % sub,
            if p.startswith('part-'):
                try:
                    i = int(p[5:])
                    flag, item = check_clause(text, clist[i], clist)
                    if not flag:
                        #print flag
                        break
                    match.append('(%s)'%item)
                except ValueError:
                    if p not in text:
                        #print False
                        break
                    match.append(p)
            else:
                if p not in text:
                    #print False
                    break
                match.append(p)
        else:
            #print 'match', '&'.join(match)
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
            app.logger.debug('%s and %s matrix are not equal' % (s2, answer))
            return False
            #return u'答案不匹配'

    if isExpressionCmp(s1):
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


def parse_answer(line, p):
    obj = re.findall(p, line)
    if not obj:
        return None
    return obj[0].split("@")


def parse_comment(line, p):
    obj = re.findall(p, line)
    if not obj:
        return None
    
    result = None
    lists = obj[0].split("#")
    for l in lists:
        if ':' not in l:
            continue

        t = []
        for s in l.split(','):
            t.append(':'.join(['"%s"' % e.strip() for e in s.strip().split(':')]))

        l = json.loads('{%s}' % ','.join(t))
        if not result:
            result = l
            continue
        for e in l:            
            result[e] = l[e]

    if not result:
        result = lists

    return result


def merge_all(items, item):
    if not items:
        return item
    if type(items) != type(item):
        print type(items), type(item)
        return items

    if isinstance(items, list):
        for e in item: 
            items.append(e)
    elif isinstance(items, dict):
        for e in item:
            items[e] = item[e]

    return items


def parse_line(line, answer, comment):
    temp1 = parse_answer(line, '@([^#]*)')
    temp2 = parse_comment(line, '#([^%]*)')
    if temp1:
        answer = merge_all(answer, temp1)
    if temp2:
        comment = merge_all(comment, temp2)
    return answer, comment


def qa_parse(content):
    qaparts = {}
    response = ''
    quiz_count = 0
    answers = []
    comments = []

    block_pattern = re.compile('{%(\w*|[^%{}@]*@[^%]*)%}', re.M)
    inline_pattern = re.compile('{%(\w*|[^%{}@]*@[^%]*)%}')
    slug = None
    block_flag = False

    for line in content.split("\n"):

        if block_flag:
            answer, comment = parse_line(line, answer, comment)
            if line.find("%}") >= 0:
                if len(answer) == 1:
                    answer = answer[0]
                if len(comment) == 1:
                    comment = comment[0]
                answers.append(answer)
                comments.append(comment)
                block_flag = False
                response += line
            continue

        if not line.lower().find('slug'):
            slug = line.split(":")[1].strip()
            continue

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
            answer = None
            comment = None
            if line.find("@") < 0:
                response += line + "\n"
            else:
                response += line[:line.find("@")] + "\n"
                answer, comment = parse_line(line, answer, comment)
            block_flag = True

    qaparts['response'] = response
    qaparts['answer'] = answers
    qaparts['comment'] = comments

    return qaparts, slug


def md_qa_parse(real_link):

    try:
        r = requests.get(real_link)
    except requests.ConnectionError:
        return {'response': False, 'info': real_link + u' not exists'}, "", None

    if not r.ok:
        return {'response': False, 'info': real_link + u' not exists'}, "", None

    if 'content-length' in r.headers and \
                    int(r.headers['content-length']) > 8 * 5000 * 1024 * 3:
        return {'response': False, 'info': real_link + u' 太长'}, "", None

    content = r.content
    qaparts, slug = qa_parse(content)

    return qaparts, content, slug


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
        pass

    meta_lines = d['response'].split("\n")[:10]
    for line in meta_lines:
        l = line.lower()
        if not l.find('summary:'):
            meta['description'] = l.split(":")[1].strip() + \
                                  meta['description']
        elif not l.find('tags:'):
            meta['keywords'] += ' '.join(l.split(":")[1].split(","))

    return meta


def meta_parse(content):
    title = None
    tags = None
    summary = None
    slug = None
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
