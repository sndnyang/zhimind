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
        beforeSend : function(){
            var _PageWidth = document.documentElement.clientWidth,
                _LoadingTop = $(".main").height() / 2 ,
                _LoadingLeft = _PageWidth > 215 ? (_PageWidth - 215) / 2 : 0,
                _LoadingHtml = $('<div></div>');
                _LoadingHtml.attr("id", "loadingDiv");
                _LoadingHtml.css("left", _LoadingLeft + 'px');
                _LoadingHtml.css("top", _LoadingTop + 'px');
                _LoadingHtml.html('教程加载中，请等待...');

                //呈现loading效果
                $(".main").append(_LoadingHtml);
        },

        success : function (data){
            var answers = data.answer,
                comments = data.comment,
                result = data.response,
                loadingMask = document.getElementById('loadingDiv');

            loadingMask.parentNode.removeChild(loadingMask);

            global_comment = comments;
            global_answers = answers;
        

            if (!result) {
                alert(data.info);
                return;
            } 

            var md = window.markdownit({html:true})
                    .use(window.markdownitMathjax)
                    ;
                  
            var content = result.split(/\r?\n/),
                tutorial = $(".tutorial"),
                count = 0,
                match,
                html = md.render(result)+"<h2>",
                reg = /<h[234]>([\d\D]*?)<h[234]>/g,
                matches = [];

            if (root === "practice") {
                reg = /<h2>([\d\D]*?)<h2>/g;
            }

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

function checkQuiz(obj, id) {
    var value,
        your_answer,
        back_check = false,
        eleparent = $(obj).parent(),
        ele = eleparent.children(".quiz"),
        type = ele.attr("type"),
        lesson_name = eleparent.parent()[0].className,
        lesson_id = parseInt(lesson_name.substr(13)),
        correct = global_answers[id-1];

    if (type === "radio") {
        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value = $(this).val();
            }
        });
    } else if (type === "checkbox") {

        value = '';

        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value += $(this).val()+"@";
            }
        });

        value = value.substring(0, value.length-1);

    } else if (type === "text") {
        value = ele.val();
    }

    if (type === "text" && ele.hasClass("formula")) {
        var expression = ele.val();
        $.ajax({
            method: "post",
            url : "/cmp_math",
            contentType: 'application/json',
            dataType: "json",
            data: JSON.stringify({'id': id, 'expression': expression}),
            success : function (result){
                check_result(result.response, lesson_id, id)
                return;
            }
        });
    } else {
        your_answer = $.md5(value);
        check_result(your_answer === correct, lesson_id, id)
    }
}

function check_result(result, id, quiz_id) {

    if (result) {
        updateLesson(id+1);
        error_times = 0;
    } else {
        $('.hint').css('display', 'block');
        $('.flashes').html('');
        if (quiz_id in global_comment) {
            var comments = global_comment[quiz_id];
                idx = Math.min(error_times, comments.length-1),
                comment = comments[idx];
            $('.flashes').append("<li>对不起， 答案错误</li>")
            $('.flashes').append("<li>提示:</li>")
            $('.flashes').append("<li>"+comment+"</li>")
        }
        error_times++;
        setTimeout("$('.hint').fadeOut('slow')", 5000)
    }
}

function to_backend_create(type, json) {
    $.ajax({
        url: '/new'+type,
        method: 'POST',
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify(json),
        success: function (result) {
            var ctype, div = $("#tutorials");
            if (type === 'practice') {
                ctype = '练习';
            }
            else if (type === 'tutorial') {
                ctype = '教程';
            }
            var entity = '<table> <tr valign="top"> <td> '+ctype+' </td> '+
                '<td>|</td> <td> <i> 您发布了:</i> <br> <a href="/'+type+'/'+
                result.uuid+'">'+json.title+'</a> </td></tr></table>';
            div.append(entity);
        }
    });
}

function linkTutorial() {

    var title = prompt("输入教程名称");
    if (title === null) 
        return ;

    var url = prompt("输入源文件url地址,后缀.mkd或.md");

    if (title != null && url != null && (url.indexOf(".mkd") > -1 || 
                url.indexOf(".md") > -1)) {
        var json = {'url': url, 'title': title};
        to_backend_create('tutorial', json);
    }
}

function linkPractice() {

    var title = prompt("输入教程名称");
    if (title === null) 
        return ;

    var url = prompt("输入源文件url地址,后缀.mkd或.md");

    if (title != null && url != null && (url.indexOf(".mkd") > -1 || 
                url.indexOf(".md") > -1)) {

        var json = {'url': url, 'title': title};
        to_backend_create('practice', json);
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

