# coding=utf-8


def printDeep(item, deep):
    if isinstance(item, (str, bool, int, float)):
        print ' '*deep, item
    elif isinstance(item, (list, tuple)):
        print ' '*deep, 'a list'
        for e in item:
            if isinstance(e, (str, bool, int, float)):
                print ' '*(deep+4), e
            else:
                printDeep(e, deep+4)
    elif isinstance(item, dict):
        print ' '*deep, 'a dict'
        for e in item:
            print ' '*(deep+4), e, ':', item[e]
            if not isinstance(e, (str, bool, int, float)):
                printDeep(e, deep+4)


def add_mastery_in_json(json, entries):
    node_map = dict((e.tutor_id, e.mastery) for e in entries)
    visited = []

    def dfs(node):
        # name = node['name']
        if "link" in node and len(node['link']):
            for e in node['link']:
                if "url" not in e:
                    continue
                if "/tutorial/" in e['url'] or "/practice/" in e['url']:
                    tid = e['url'].split('/')[-1].split('?')[0]
                    if tid in node_map:
                        node['level'] = node_map[tid]

        if 'children' not in node:
            return node

        child_level = 0
        for child in node['children']:
            if child not in visited:
                child_node = dfs(child)
                if child_node and 'level' in child_node:
                    child_level += child['level']

        if child_level:
            if 'level' not in node:
                node['level'] = 0
            node['level'] += child_level * 1.0 / len(node['children'])
        return node

    dfs(json)

