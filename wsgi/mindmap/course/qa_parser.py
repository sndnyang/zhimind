# -*- coding=utf-8 -*-
import re
import json
import requests


def find_right_next(s, i, n, char):
    if i >= len(s):
        return i

    if s[i] in '{[(':
        return find_right_next(s, i + 1, n + 1, char)
    elif s[i] in '%' + char and n == 0:
        return i
    elif s[i] in '}])' and n > 0:
        return find_right_next(s, i + 1, n - 1, char)
    else:
        return find_right_next(s, i + 1, n, char)


def finite_status_machine(c, char):
    start = 0
    lists = []
    if c[-2:] == '%}':
        c = c[:-2]
    while start < len(c):
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
    # print len(lists), quiz_type
    for l in lists:
        if quiz_type != 'process':
            break

        t = finite_status_machine(l, ':')
        lt = len(t)
        answer_map = {}
        if lt == 0:
            answer_map = {'': ([], '')}
        if lt == 1:
            answer_map = {t[0]: ([], '')}
        if lt == 2:
            if t[1][0] == '$' or t[1][0] == '!' or t[1][0] == '`':
                answer_map = {t[0]: ([], t[1])}
                options.append(t[1])
            else:
                answer_map = {t[0]: (t[1].split(','), '')}
        if lt == 3:
            answer_map = {t[0]: (t[1].split(','), t[2])}
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
    result = [{}, []]
    for l in lists:
        if ':' not in l:
            result[1].append(l)
            continue

        t = []
        for s in finite_status_machine(l, '#'):
            t.append(':'.join(
                ['"%s"' % e.replace('\n', '').replace('\r', '')
                 for e in s.split(':', 1)]))

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

    start = content.find("{%")
    lists = []
    while 0 <= start < len(content):
        end = find_right_next(content, start, 0, '\n')
        s = content[start:end]
        lists.append(s)
        quiz_type = re.search('^{%(\w+)|', s, re.M).group(1)
        answer, comment = parse_quiz(s, quiz_type)
        answers.append(answer)
        comments.append(comment)
        start = content.find("{%", end)

    for s in lists:
        content = content.replace(s, s[:s.find('@')].strip() + '%}\n')

    response = content
    # block_pattern = re.compile('{%(\w*|[^%{}@]*@[^%]*)%}', re.M)
    # response = re.sub(block_pattern, extract, content)

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
