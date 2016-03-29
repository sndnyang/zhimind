var global_answers = null;
var global_comment = null;

function loadTutorial(link) {
    'use strict';
    $.ajax({
        url : "/convert/"+link,
        contentType: 'application/json',
        dataType: "json",
        success : function (result){
            var answers = result.answer,
                comments = result.comment,
                result = result.response;

            global_comment = comments;
            global_answers = answers;
            
            var md = window.markdownit({html:true})
                    .use(window.markdownitMath);
                  
            var content = result.split(/\r?\n/),
                tutorial = $("#tutorial"),
                count = 0,
                match,
                html = md.render(result)+"<h2>",
                reg = /<h2>([\d\D]*?)<h2>/g,
                matches = [];

            while (match = reg.exec(html)) {
                matches.push(match[0]);
                reg.lastIndex = match.index + 1;
            }

            for (var i in matches) {
                count += 1;
                var lesson = matches[i].substring(0, matches[i].length-4)
                var lesson_div = $('<div></div>');
                lesson_div.attr('class', 'lesson lesson'+count);
                lesson_div.html(lesson);
                lesson_div.appendTo(tutorial);
            }

            initLesson(link);
        }
    });

}

function linkTutorial() {

    var title = prompt("输入教程名称");
    if (title === null) 
        return ;

    var url = prompt("输入源文件url地址,后缀.mkd或.md");

    if (title != null && url != null && (url.indexOf(".mkd") > -1 || url.indexOf(".md") > -1
                || url.indexOf(".hst") > -1)) {
        $.ajax({
            url: '/newtutorial',
            method: 'POST',
            contentType: 'application/json',
            dataType: "json",
            data: JSON.stringify({'url': url, 'title': title}),
            success: function (result) {
                var div = $("#tutorials");
                var entity = '<table> <tr valign="top"> <td> 教程 </td> '+
                    '<td>|</td> <td> <i> 您发布了:</i> <br> <a href='+
                    '"/tutorial/'+result.uuid+'">'+title+'</a> </td></tr>'+
                    '</table>';
                div.append(entity);
            }
        });
    }
}
