#coding=utf-8 
import re
import md5
import requests

from xml.etree.ElementTree import tostring

from mindmap import app

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
            blank = '<div id="MathPreview"></div><br>\n'
            blank += '<input type="text" class="quiz formula" '
            blank += 'onchange="Preview.Update(this)">\n' 

            question = question.replace('_', '<br>'+blank+'<br>')

            response += question
            response += submit % quiz_count
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
                return node 

        if 'children' not in node:
            return None

        for child in node['children']:
            if child not in visited:
                node = dfs(child, name)
                if node:
                    return node
        else:
            return None

    node = dfs(json, '')
    node['level'] = node_map[node['name']][1]
