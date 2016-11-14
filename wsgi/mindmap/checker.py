# coding=utf-8
import re
import random

from sympy import simplify_logic


def is_expression_cmp(s):
    for e in ['=', '>', '<']:
        if e in s:
            return True
    return False


def check_clause(text, s, items):

    # print text
    if s == '':
        return True, ''
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
                    flag, item = check_clause(text, items[i], items)
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


def check_text_with_pre(l, answers):
    item = l[0]
    for k in answers:
        f, r = checkText(item, k)
        if not f:
            continue
#       print item, 'has pre', answers[k][0]
#       print l[1]
        for e in answers[k][0]:
            if len(l) == 1 or e not in l[1]:
#               print '%s not in l[1]' % e, l[1]
                return False, e
        else:
            return True, r
#   print 'not find k in answers', item
    return False, item


def sample(l, s):
    if len(l) < 6:
        return l
    nl = random.sample([e for e in l if e != s], 4)
    nl.append(s)
    return nl


def similar(k, r):
    return k in r


def get_comments(comments, r):
    for k in comments[0]:
        if not similar(k, r):
            continue
        return comments[0][k]
    return comments[1]


def check_process(l, answers, comments):
    if len(l) > 2:
        c = l[2][1]
        for k in answers:
            if k == c and answers[k][1] == l[2][0]:
                break
        else:
            return False, u'前一步推导结果选择错误', None
    f, r = check_text_with_pre(l, answers)
    match = None
    if f:
        match = {r: l[0]}
        if answers[r][1]:
            options = sample(answers['options'], answers[r][1])
        else:
            options = None
    else:
        options = get_comments(comments, r)
    return f, options, match


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

