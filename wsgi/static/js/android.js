var root = null;
var point = null;

function toggleLink() {
    console.log($(".link").css('display'));
    if ($(".link").css('display') === 'none') {
        $("a.link").css('display', 'block');
    }
    else {
        $("a.link").css('display', 'none');
    }
}

function showList() {
    var name = root.name;
    if (root.link && root.link.length) {
        name = " onclick='toggleLink()' >" + name;
        name += "<i class='fa fa-angle-right' style='float:right'>";
    }
    else {
        name = ">" + name;
    }

    $("#mainMap").append("<li><a href='javascript:void(0)' id='nodename'"+name+"</a></li>");

    if (root.link && root.link.length) {
        for (var i in root.link) {
            var link = root.link[i],
                name = link.name,
                url = link.url,
                curparts = document.URL.split('/'),
                li = $("<li></li>"),
                a = $("<a class='link'></a>");
            a.attr("href", url+'?id='+curparts[4]+'&name='+name+'&parent='+root.name);
            cnsole.log(a)
            li.append(a);
            $("#mainMap").append(li);
        }
    }

    if (root.children && root.children.length) {
        for (var i in root.children) {
            var child = root.children[i];
            $("#mainMap").append("<li><a href='javascript:void(0)' class='subnode' onclick='goSub("+i+")'>"+child.name+"</a></li>");
        }
    }
    if (root.parent)
        $("#mainMap").append("<li><a href='javascript:void(0)' onclick='goUpLevel()'>上层:"+root.parent.name+"</a></li>");
}

function androidLoadMap(id, link) {
    $.ajax({
        url: link,
        contentType: 'application/json',
        dataType: "json",
        success : function (data) {
            root = data;
            var treeData = constructParent(root);
            var showTag = true;
            if (id == "#sidebar-wrapper") 
                showTag = false;
            $(id).treeview({
                color: "#428bca",
                expandIcon: 'glyphicon glyphicon-chevron-right',
                collapseIcon: 'glyphicon glyphicon-chevron-down',
                // nodeIcon: 'glyphicon glyphicon-bookmark',
                levels: 3,
                enableLinks: true,
                showTags: showTag,
                data: [treeData]
            });
        }
    });
} 

function constructParent(node) {
    var temp = {text: node.name, nodes: [], tags: []},
        curparts = document.URL.split('/'), url_params;

    url_params = '?id=' + curparts[curparts.length-1] + '&name=' + node.name;

    if (node.parent)
        url_params += '&parent=' + node.parent.name;

    if (node.level) {
        var white = d3.rgb(255, 255, 255);
        var red   = d3.rgb(255, 0,   0);
        var compute = d3.interpolate(white, red);
        temp.backColor = compute(node.level / 8.0);
    }
    if (node.link && node.link.length) {
        temp.href = "javascript:void(0)";
        temp.tags.push(node.link.length);
        for (var i in node.link) {
            var url = {text: node.link[i].name, 
                href: node.link[i].url + url_params,
                color: "purple", 'icon': 'glyphicon glyphicon-bookmark'}
            temp.nodes.push(url);
        }
    }
    if (node.children && node.children.length) {
        temp.tags.push(node.children.length);
        for (var i in node.children) {
            temp.nodes.push(constructParent(node.children[i]));
        }
    }
    return temp;
}

function goUpLevel() {
    
    root = root.parent;

    $("#mainMap").empty();
    showList();
    
}

function goSub(i) {
    root = root.children[i];
    $("#mainMap").empty();
    showList();
}

