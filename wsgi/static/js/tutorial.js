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
        url : "/convert/"+link+"?random="+Math.random(),
        contentType: 'application/json',
        dataType: "json",
        beforeSend : function(){
            var _PageWidth = document.documentElement.clientWidth,
                _PageHeight = document.documentElement.clientHeight,
                _LoadingTop = _PageHeight / 2,
                _LoadingLeft = _PageWidth > 215 ? (_PageWidth - 215) / 2 : 0,
                _LoadingHtml = $('<div></div>');
            _LoadingHtml.attr("id", "loadingDiv");
            _LoadingHtml.css("left", _LoadingLeft + 'px');
            _LoadingHtml.css("top", _LoadingTop + 'px');

            _LoadingHtml.html('教程加载中，请稍等...');

            //呈现loading效果
            $(".container-fluid").append(_LoadingHtml);
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
                    .use(window.markdownitMathjax);
                  
            var content = result.split(/\r?\n/),
                tutorial = $("#tutorial"),
                count = 0,
                match,
                html = md.render(result)+"<h1>",
                reg = /<h[1234]>([\d\D]*?)<h[1234]>/g,
                matches = [];

            if (root === "practice") {
                reg = /<h1>([\d\D]*?)<h1>/g;
            }

            while (match = reg.exec(html)) {
                matches.push(match[0]);
                reg.lastIndex = match.index + 1;
            }

            for (var i in matches) {
                count += 1;
                var lesson_div = $('<div></div>'),
                    nextclick = 'onclick="updateLesson('+(count+1)+')"',
                    prevclick = 'onclick="previousLesson('+(count-1)+')"',
                    next_button = $('<button '+nextclick+'>下一段</button>'),
                    prev_button = $('<button '+prevclick+'>上一段</button>'),
                    lesson = matches[i].substring(0, matches[i].length-4);
                
                lesson_div.attr('class', 'lesson lesson'+count);
                lesson_div.html(lesson);
                if (root !== 'practice') {
                    if (!lesson_div.find('button').length) {
                        lesson_div.append(next_button);
                    }
                    lesson_div.append(prev_button);
                } 
                lesson_div.append($('<br>'));
                lesson_div.appendTo(tutorial);
            }

            global_lesson_count = count;

            if (root === "practice") {
                draw();
            }
            initLesson(link);
            MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
        }
    });

    backToTop();
}

function draw() {
    initData();
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

    } 

    //if (type === "text" && ele.hasClass("formula")) {
    if (type === "text") {
        var expression = [];
        for (var i = 0; i < ele.length; i++) {
            expression.push(ele[i].value)
        }

        var url = "/checkTextAnswer";
        if (ele.hasClass("formula"))
            url = "/cmp_math";

        $.ajax({
            method: "post",
            url : url,
            contentType: 'application/json',
            dataType: "json",
            data: JSON.stringify({'id': id, 'expression': expression}),
            success : function (result){

                if (!result.info)
                    check_result(result.response, lesson_id, id);
                else {
                    $('.hint').css('display', 'block');
                    $('.flashes').html('');
                    $('.flashes').append("<li>对不起</li>")
                    $('.flashes').append("<li>"+result.info+"</li>")
                    setTimeout("$('.hint').fadeOut('slow')", 5000)
                }
                return;
            }
        });
    } else {
        your_answer = $.md5(value);
        check_result(your_answer === correct, lesson_id, id);
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
            if (result.error !== "success") {
                alert(result.error);
                return;
            }

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
        }
    });
}

function editTutorial(obj) {
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
        }
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

/**
 * 回到顶部
 */
function backToTop() {
    //滚页面才显示返回顶部
    $(window).scroll(function() {
        if ($(window).scrollTop() > 100) {
            $("#top").fadeIn(500);
        } else {
            $("#top").fadeOut(500);
        }
    });

    //点击回到顶部
    $("#top").click(function() {
        $("body").animate({
            scrollTop: "0"
        }, 500);
    });

    if ($(window).scrollTop() > 100) {
        $("#top").fadeIn(500);
    } else {
        $("#top").fadeOut(500);
    }
}
