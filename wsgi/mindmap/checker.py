#coding=utf-8
import re

from sympy import simplify_logic

from parser import *
from checker import *

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


def check_text_with_pre(item, answers, items):
    for k in answers[::-1]:
        f, r = checkText(item, k)
        if not f:
            continue
        for e in answers[k][0]:
            if e in items:
                if items[e]:
                    continue
                f, r = check_text_with_pre(e, answers, items)
            else:
                pass
    return f, r


def sample(l, s):
    if len(l) < 6:
        return l
    nl = random.sample([e for e in l if e != s], 4)
    nl.append(s)
    return nl


def check_process(l, answers, comments):
    if len(l) > 2:
        c = l[-1][-2][0]
        if c == '`' or c == '$' or c == '!':
            for k in answers.keys():
                f, r = checkText(l[-3], k)
                if f and answers[k][1] == c:
                    break
            else:
                return u'前一步推导结果选择错误'
    f, r = check_text_with_pre(l[-1], answers)
    if f:
        if answers[r][1]:
            options = sample(answers['options'], answers[r][1])
        else:
            options = None
    else:
        options = comments
    return f, options


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

