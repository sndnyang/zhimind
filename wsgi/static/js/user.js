function getLinkName(obj) {
    var eleps= $(obj).parents('.navbar-default'),
        ele = eleps.children('.navbar-brand'),
        span = ele.children('span'),
        a = ele.children(".tutoriallink");
    return '{0} {1}'.format(span.html(), a.html());
}

function getLinkId(obj) {
    var eleps= $(obj).parents('.navbar-default'),
        ele = eleps.children('.navbar-brand').children(".tutoriallink"),
        tid = ele.attr("href").split("/")[2];
    return tid;
}

function syncTutorial(obj) {
    var json = {'id': getLinkId(obj)};
    if (!tid) {
        alert("该教程没有远程url，不可同步，请使用在线编辑");
        return;
    }
    $.ajax({
        url: '/syncTutorial',
        method: 'POST',
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(json),
        success: function (result) {
            if (result.error !== "success") {
                alert(result.error);
                return;
            }
        },
        error: backendError
    });
}

function deleteTutorial(obj) {
    var json = {'id': getLinkId(obj)},
        name = getLinkName(obj),
        li_element = $(obj).parents('li'),
        sentence = "确定要删除 {0} 吗？".format(name);
    
    if (!confirm(sentence)) {
        return;
    }


    $.ajax({
        url: '/deleteTutorial',
        method: 'POST',
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(json),
        success: function (result) {
            if (result.error !== "success") {
                alert(result.error);
                return;
            }
            li_element.remove();
        },
        error: backendError
    });
}

function editNameAndLink(obj) {
    var url, title = prompt("输入新名称, no则不改变");

    if (!title)
        return;

    url = prompt("输入新文件url地址,后缀不限, no则不改变");

    if (!url)
        return;

    if (url === "no" && title === "no") {
        alert("名字、链接都不改， 没意义");
        return;
    }

    var json = {'id': getLinkId(obj), 'url': url, 'title': title},
        ele = $(obj).parents('.navbar-default').children('.navbar-brand')
                    .children(".tutoriallink");

    $.ajax({
        url: '/editTutorial',
        method: 'POST',
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(json),
        success: function (result) {
            if (result.error !== "success") {
                alert(result.error);
                return;
            }

            if (title !== "no") {
                ele.html(title);
            }
        },
        error: backendError
    });
}

function linkTutorial() {

    var title = prompt("输入教程名称");
    if (!title)
        return ;

    var url = prompt("输入源文件url地址,后缀.mkd或.md");

    if (title && url && (url.indexOf(".mkd") > -1 ||
                url.indexOf(".md") > -1)) {
        var json = {'url': url, 'title': title};
        to_backend_create('tutorial', json);
    }
}

function linkPractice() {

    var title = prompt("输入教程名称");
    if (!title)
        return ;

    var url = prompt("输入源文件url地址,后缀.mkd或.md");

    if (title && url && (url.indexOf(".mkd") > -1 ||
                url.indexOf(".md") > -1)) {

        var json = {'url': url, 'title': title};
        to_backend_create('practice', json);
    }
}
