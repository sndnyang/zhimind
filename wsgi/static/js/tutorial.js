var global_answers = null;
var global_comment = null;
var global_lesson_count = 0;
var error_times = 0,
    currentLesson = 1,
    global_link = 'currentLesson';

var Preview = {
    preview: null,     // filled in by Init below
    Update: function (obj) {
        var ele = $(obj), 
            parentdiv = ele.parent(),
            preview = parentdiv.children("#MathPreview"),
            text = ele.val();
        preview.html('`'+text+'`');
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, "MathPreview"]);
    }
};

function updateMastery() {
    var params = getRequest(),
        url = document.URL.split('/'),
        link = url[url.length-1].split('?')[0];

    if (!params) {
        return;
    }

    params.tutor_id = link;
    $.ajax({
        method: "post",
        url : "/update_mastery",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(params),
        success : function (result){
            if (!result.response) {
                alert("更新掌握度失败! "+result.info);
            }
        }
    });   
}

function loadTutorial(link) {
    'use strict';
    var root = document.URL.split('/')[3]; 
    $.ajax({
        url : "/convert/"+link,
        contentType: 'application/json',
        dataType: "json",
        success : function (data){
            var answers = data.answer,
                comments = data.comment,
                result = data.response;

            global_comment = comments;
            global_answers = answers;
        
            if (!result) {
                alert(data.info);
                return;
            } 

            var md = window.markdownit({html:true})
                    .use(window.markdownitMathjax);
                  
            var content = result.split(/\r?\n/),
                tutorial = $(".tutorial"),
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
                var lesson_div = $('<div></div>'),
                    onclick = 'onclick="updateLesson('+(count+1)+')"',
                    button_div = $('<button '+onclick+'>下一段</button>'),
                    lesson = matches[i].substring(0, matches[i].length-4);
                
                lesson_div.attr('class', 'lesson lesson'+count);
                lesson_div.html(lesson);
                lesson_div.appendTo(tutorial);
                if (root !== 'practice' && !lesson_div.find('button').length) {
                    lesson_div.append(button_div);
                }
            }

            global_lesson_count = count;
            initLesson(link);
            MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        }
    });
    if (root === "practice") {
        draw();
    }
}

function draw() {
    initData();
    initNetwork();
    generateStepLog();
}

function linkTutorial() {

    var title = prompt("输入教程名称");
    if (title === null) 
        return ;

    var url = prompt("输入源文件url地址,后缀.mkd或.md");

    if (title != null && url != null && (url.indexOf(".mkd") > -1 || 
                url.indexOf(".md") > -1)) {
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

function linkPractice() {

    var title = prompt("输入教程名称");
    if (title === null) 
        return ;

    var url = prompt("输入源文件url地址,后缀.mkd或.md");

    if (title != null && url != null && (url.indexOf(".mkd") > -1 || 
                url.indexOf(".md") > -1)) {
        $.ajax({
            url: '/newpractice',
            method: 'POST',
            contentType: 'application/json',
            dataType: "json",
            data: JSON.stringify({'url': url, 'title': title}),
            success: function (result) {
                var div = $("#tutorials");
                var entity = '<table> <tr valign="top"> <td> 练习 </td> '+
                    '<td>|</td> <td> <i> 您发布了:</i> <br> <a href='+
                    '"/practice/'+result.uuid+'">'+title+'</a> </td></tr>'+
                    '</table>';
                div.append(entity);
            }
        });
    }
}
function getRequest() {   
   var url = location.search; //获取url中"?"符后的字串   
   var theRequest = new Object();   
   if (url.indexOf("?") != -1) {   
      var str = url.substr(1);   
      strs = str.split("&");   
      for(var i = 0; i < strs.length; i ++) {   
         theRequest[strs[i].split("=")[0]] = decodeURI(strs[i].split("=")[1]);
      }   
   }
   else {
       return null;
   }
   return theRequest;   
}

