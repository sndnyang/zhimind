function save_tutorial() {
    var tid = document.URL.split('/')[4], source = $('.source').val(), lines,
        title = /^\s*title/im, slug = /^\s*slug/im, tags = /^\s*tags/im,
        summary = /^\s*summary/im, temp = source.substr(0, 1000);
    if (!temp.match(title)) {
        alert("请在开头添加一行 title: 标题")
        return;
    }
    if (!temp.match(slug)) {
        alert("请在开头添加一行 slug: the-title-in-english-for-read")
        return;
    }
    if (!temp.match(tags)) {
        alert("请在开头添加一行 tags: tag1 tag2 tag3 tag4 只能用逗号隔开")
        return;
    }
    if (!temp.match(summary)) {
        alert("请在开头添加一行 summary: 总结描述")
        return;
    }

    $.ajax({
        method: "post",
        url : "/save_tutorial",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({'id': tid, 'content': source}),
        success : function (result){

            if (result.error === "success") {
                if ('id' in result) {
                    alert("添加新教程成功，即将跳转...");
                    window.onbeforeunload = false;
                    window.location.href = "/editor/" + result.id;
                } else {
                    alert("更新成功！");
                }
            } else {
                alert("更新失败！" + result.error);
            }
            return;
        },
        error: backendError
    });
}
