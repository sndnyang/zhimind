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

    $("#mainMap").append("<li><a href='#' id='nodename'"+name+"</a></li>");

    if (root.link && root.link.length) {
        for (var i in root.link) {
            var link = root.link[i],
                name = link.name,
                url = link.url;
            $("#mainMap").append("<li><a href='"+url+"' class='link'>"+name+"</a></li>");
        }
    }

    if (root.children && root.children.length) {
        for (var i in root.children) {
            var child = root.children[i];
            $("#mainMap").append("<li><a href='#' class='subnode' onclick='goSub("+i+")'>"+child.name+"</a></li>");
        }
    }
    if (root.parent)
        $("#mainMap").append("<li><a href='#' onclick='goUpLevel()'>上层:"+root.parent.name+"</a></li>");
}

function androidLoadMap(link) {

    $.ajax({
        url: link,
        contentType: 'application/json',
        dataType: "json",
        success : function (data) {
            root = data;
            console.log(root);
            constructParent(root, null);
            showList();
        }
    });
} 

function constructParent(node, p) {
    node.parent = p;
    if (node.children && node.children.length) {
        for (var i in node.children) {
            constructParent(node.children[i], node);
        }
    }
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

