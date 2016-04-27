function updateData() {
    var data = {
        nodes: nodes,
        edges: edges
    };

    network.setData(data);
}

function markNodes(nodes_list) {

    if (nodes_list.length == 0) {
        return;
    }

    var colors = []
    for (var i = 0; i < nodes.length; i++) {
        colors.push({id: (i+1), color: {background: 'orange'}})
    }

    for (var i in nodes_list) {
        if (nodes_list[i] > nodes.length) {
            alert("要标注的点ID超过最大ID");
            return;
        }
        colors.push({id: nodes_list[i], color: {background: 'red'}})
    }
    nodeSet.update(colors);
}
