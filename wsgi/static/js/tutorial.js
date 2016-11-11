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
            preview = parentdiv.children(".MathPreview").eq(0),
            pid = preview.attr("id"),
            previewEle = document.getElementById(pid),
            text = ele.val();
        MathJax.Hub.Config({
            messageStyle: "none"
        });
        preview.html("`" + text + "`");
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, previewEle]);
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

String.prototype.format = function() {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g,
        function(m,i){
            return args[i];
        }
    );
}

String.prototype.trim = function() {
    return this.replace(/(^\s*)|(\s*$)/g, "");
}

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function qa_parse(c) {
    var clists = [], type, stem, template, match,
        answer, qparts, submit, html = "", quiz_count = 0,
        p = /{%([\w\W]*?)%}/g,
        typep = /([\w\W]*?)\|/,
        stemp = /\|[\w\W]*/,
        submit = '<br><button onclick="checkQuiz(this, {0})">submit</button><br><br>';

    while (match = p.exec(c)) {
        clists.push(match[0]);
        p.lastIndex = match.index + 1;
    }

    var start = 0;

    for (var i in clists) {
        var stemend, temp = clists[i],
            response = $('<div class="math-container"></div>'),
            div = $('<div class="process"></div>'),
            feedback = $('<div class="hidden"></div>');

        type = temp.match(typep)[0];
        type = type.substring(2, type.length-1).trim();

        stem = temp.match(stemp)[0];
        stemend = stem.indexOf("@");
        if (stemend < 0)
            stemend = stem.length
        stem = stem.substring(1, stemend).trim();
        //console.log(type + ' stem ' + stem);
        if (stem.endsWith("%}")) {
            stem = stem.substring(0, stem.length-2).trim();
        }

        if (type == "radio" || type == "checkbox") {
            quiz_count++;
            qparts = stem.split("&");
            if (qparts[0].trim() !== "") {
                qparts[0] = "<br>" + qparts[0];
            }
            var span = $("<span>{0}</span>".format(qparts[0]));
            template = '<input type="{0}" class="quiz" name="quiz" value="{1}">{2}</input>';
            span.append($("<br>"));
            for (var j = 1; j < qparts.length; j++) {
                var option = template.format(type, qparts[j], String.fromCharCode(64+j)
                        + ". " + qparts[j]) + '<br>';
                span.append($(option));
            }
            div.append(span);
        }
        else if (type == "text") {
            quiz_count++;
            var blank = $('<input type="text" class="quiz">');
            blank.attr("onkeydown", 'return check(this, event, "quiz",'+quiz_count+")");
            div.append($('<br><span>'+stem.replace(/_/g, blank[0].outerHTML)+'</span><br>'));
        }
        else if (type == "formula") {
            quiz_count++;
            var blank = $('<input type="text" class="quiz formula">'),
                span;
            blank.attr("onkeydown", 'return check(this, event, "quiz",'+quiz_count+")");
            span = $('<span>'+stem.replace(/_/g, blank[0].outerHTML)+'</span>');
            span.append($('<br><div class="MathPreview"></div><br>'));
            div.append("<br>")
            div.append(span);
        } else if (type == "process") {
            quiz_count++;
            qparts = stem.split("$");
            var step_div = $('<div class="step-div"></div>'),
                input = $('<input type="text" class="small_step"/>'),
                input3 = $('<input type="text" class="small_step"/>'),
                input2 = $('<input type="text" class="small_step"/>');

            input.attr("placeholder", "定理名或原理描述,回车验证");
            input.attr("onkeydown", "return check(this, event, 'process'," +
                                    quiz_count+")");

            div.append($('<p>{0}</p>'.format(qparts[0])));

            step_div.append($('<span style="float: left">根据：</span>'));
            step_div.append(input);
            div.append(step_div);

            step_div = $('<div class="step-div"></div>');
            step_div.append($('<span style="float: left">根据：</span>'));
            step_div.append(input2);
            div.append(step_div);

            for (var j = 1; j < qparts.length; j++) {
                var t = String.fromCharCode(64+j) + ".$" + qparts[j] + "$";
            }
        }

        div.append('<br>');
        div.append(feedback);
        response.append(div);
        response.append($(submit.format(quiz_count)));

        html += c.substring(start, c.indexOf(temp)) + response[0].outerHTML;
        start = c.indexOf(temp) + temp.length;
    }
    html += c.substring(start, c.length);

    return html;
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
            //setTimeout("$('.loadingDiv').fadeOut('slow')", 5000);
        },
        success : function (data){
            var result = data,
                loadingMask = document.getElementById('loadingDiv');

            loadingMask.parentNode.removeChild(loadingMask);

            if (!result) {
                alert(data.info);
                return;
            } 

            var md = window.markdownit({html:true})
                    .use(window.markdownitMathjax)
                    .use(window.markdownitEmoji);
            md.renderer.rules.emoji = function(token, idx) {
              return twemoji.parse(token[idx].content);
            };
            var content = result.split(/\r?\n/),
                tutorial = $("#tutorial"),
                count = 0,
                match,
                html = md.render(qa_parse(result))+"<h1>",
                reg = /<h[1234]([\d\D]*?)<h[1234]/g,
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
                    lesson_div.append(prev_button);
                    if (lesson_div.find('button').length === 1) {
                        lesson_div.append(next_button);
                    }
                } 
                lesson_div.append($('<br>'));
                lesson_div.appendTo(tutorial);
            }

            global_lesson_count = count;

            if (root === "practice") {
                draw();
            }
            initLesson(link);
            MathJax.Hub.Config({
                messageStyle: "none"
            });
            MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

        }
    });

    backToTop();
}

function draw() {
    initData();
}

function check(obj, e, type, id) {
    if ($(obj).is(".formula")) {
        Preview.Update(obj);
    }
    if(e.keyCode == 13) {
        if (type === "quiz") {
            checkQuiz($(obj).parent().parent(), id);
        }
        else if (type === "process") {
            checkProcess(obj, id);
        }
        return false;
    }
    return true;
}

function checkProcess(obj, id) {
    console.log("small step enter to backend");
    var parent = $(obj).parents(".process"),
        allStep = parent.children(".step-div").children(".small_step"),
        allValue = [];
    for (var i = 0; i < allStep.length; i++) {
        allValue.push(allStep[i].value);
    }
    console.log(allValue);
    console.log(id);
    var tutorial_url = document.URL.split('/')[4];
    $.ajax({
        method: "post",
        url : "/checkProcess",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({'id': id, 'expression': allValue,
                'url': tutorial_url}),
        success : function (result){
            console.log(result);
            //if(result.response) {
            //    check_result(result.response, lesson_id, id);
            //}
            return;
        }
    });
}

function checkQuiz(obj, id) {
    var value,
        url = "/checkTextAnswer",
        tutorial_url = document.URL.split('/')[4],
        your_answer,
        back_check = false,
        eleparent = $(obj).parent(),
        problem = eleparent.children(".process"),
        ele = problem.children().children(".quiz"),
        type = ele.attr("type"),
        lesson_name = eleparent.parent()[0].className,
        lesson_id = parseInt(lesson_name.substr(13));

    if (type === "radio") {
        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value = $(this).val();
            }
        });

        url = "/checkChoice";

    } else if (type === "checkbox") {

        value = '';

        ele.each(function() {
            if ($(this).prop('checked') === true) {
                value += $(this).val()+"@";
            }
        });

        value = value.substring(0, value.length-1);
        url = "/checkChoice";

    } else if (type === "text") {
        value = [];
        for (var i = 0; i < ele.length; i++) {
            value.push(ele[i].value)
        }

        if (ele.hasClass("formula")) url = "/cmp_math";
    } 

    $.ajax({
        method: "post",
        url : url,
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({'id': id, 'expression': value,
                'url': tutorial_url}),
        success : function (result){
            console.log(result);
            if (result.comment) {
                var comment = result.comment;
                if (typeof(result.comment) !== "string") {
                    comment = result.comment[Math.min(error_times, result.comment.length)];
                }
                problem.children('div').html(comment);
                if (result.response)
                    problem.children('div').attr('class', 'alert alert-success');
                else
                    problem.children('div').attr('class', 'alert alert-danger');
                error_times++;
            }
            if (result.info) {
                $('.hint').css('display', 'block');
                $('.flashes').html('');
                $('.flashes').append("<li>对不起</li>")
                $('.flashes').append("<li>"+result.info+"</li>")
                setTimeout("$('.hint').fadeOut('slow')", 5000)
            } else if(result.response) {
                problem.children('div').attr('class', 'hidden');
                check_result(result.response, lesson_id, id);
            }

            return;
        }
    });
}

function check_result(result, id, quiz_id) {

    if (result) {
        updateLesson(id+1);
        error_times = 0;
    } else {
        $('.hint').css('display', 'block');
        $('.flashes').html('');

        $('.flashes').append("<li>不对哦，再想想!</li>")
        $('.flashes').append("<li>"+result.comment+"</li>")

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
            console.log(result);
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
        }
    });
}

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
