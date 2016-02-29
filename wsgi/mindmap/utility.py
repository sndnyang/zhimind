

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
