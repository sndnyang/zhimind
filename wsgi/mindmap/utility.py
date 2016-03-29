import re
import md5

from mindmap import app

def md_qa_parse(urlfp):

    qaparts = {}
    response = ''
    quiz_count = 0
    answers = []
    comments = {}
    
    while True:
        line = urlfp.readline()
        if not line:
            break

        lists = re.findall('{%([^%{}@]*@[^%{}@]*)%}', line)
        if not lists:
            response += line
            continue

        sterm = lists[0]
        pattern = '([^|]*)\|([^@]*)@([^#]*)'
        parts = re.findall(pattern, sterm)[0]

        question = parts[1]
        tmp = md5.new()
        tmp.update(parts[2])
        encry = tmp.hexdigest()
        answers.append(encry)

        if parts[0] == "radio" or parts[0] == "checkbox":
            quiz_count += 1
            etype = parts[0]
            qparts = question.split('&')
            question = '<p>%s</p>' % qparts[0]
            response +=  question
            template = '<input type="%s" name="quiz%d"'+\
                'value="%s">%s</input><br>'
            for v in qparts[1:]:
                ele = template % (etype, quiz_count, v, v)
                response += ele

            response += '<br><button onclick="checkQuiz(%d)"' % quiz_count
            response += '>submit</button><br><br>\n'

        elif parts[0] == "gapfill":
            quiz_count += 1
            blank = '<input type="text" name="quiz%d" ' % quiz_count
            blank += 'style="border:none;border-bottom:1px solid #000;">' 
            question = question.replace('_', blank)
            response += question
            response += '<br><button onclick="checkQuiz(%d)"' % quiz_count
            response += '>submit</button><br><br>\n'

        comment_pos = line.find('#')
        if comment_pos:
            comment = re.findall('#([^#]*)', sterm)
            comments[quiz_count] = comment

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

        for child in node['children']:
            if child not in visited:
                node = dfs(child, name)
                if node:
                    return node
        else:
            return None

    node = dfs(json, '')
    node['level'] = node_map[node['name']][1]
