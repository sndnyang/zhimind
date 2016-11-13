function synchTutorial(obj) {
    var eleps= $(obj).parentsUntil('div'),
        tableele = $(eleps[eleps.length - 1]),
        ele = $(eleps[1]).children('.link').children(".tutoriallink"),
        tid = ele.attr("href").split("/")[2],
        json = {'id': tid};
    if (!tid) {
        alert("该教程没有远程url，不可同步，请使用在线编辑");
    }
    $.ajax({
        url: '/synchTutorial',
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
    var eleps= $(obj).parentsUntil('div'),
        tableele = $(eleps[eleps.length - 1]),
        ele = $(eleps[1]).children('.link').children(".tutoriallink"),
        tid = ele.attr("href").split("/")[2],
        json = {'id': tid};

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
            tableele.remove();
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

    var eleparent = $(obj).parent().parent(),
        ele = eleparent.children(".link").children(".tutoriallink"),
        link = ele.attr("href"),
        tid = link.split("/")[2],
        json = {'id': tid, 'url': url, 'title': title};

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