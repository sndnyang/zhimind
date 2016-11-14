var global_answers = null;
var global_comment = null;
var global_lesson_count = 0;
var error_times = 0,
    currentLesson = 1,
    global_link = 'currentLesson',
    match = {},
    option_match = {};

var md = window.markdownit({html:true})
        .use(window.markdownitMathjax)
        .use(window.markdownitEmoji);
md.renderer.rules.emoji = function(token, idx) {
  return twemoji.parse(token[idx].content);
};


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
            if (!result.status) {
                alert("更新掌握度失败! "+result.info);
            }
        },
        error: backendError
    });   
}

function display_comments(div, result) {
    var comment = result.comment, c = ".hidden";
    if (typeof(comment) !== "string") {
        if (error_times < comment.length) {
            comment = result.comment[error_times];
        } else {
            comment = ""
            for (var i = 0; i < result.comment.length; i++) {
                comment += result.comment[i];
                if (i < comment.length - 1) {
                    comment += "<br>";
                }
            }

        }
    }
    div.children(c).html(comment);
    div.children(".comment").html(comment);
    if (result.status) {
        div.children(c).attr('class', 'comment alert alert-success');
        div.children(".comment").attr('class', 'comment alert alert-success');
    }
    else {
        div.children(c).attr('class', 'comment alert alert-danger');
        div.children(".comment").attr('class', 'comment alert alert-danger');
    }
    error_times++;
}

function validateOption(obj) {
    console.log($(obj).attr("readonly"));
    if (obj.value.trim() === "") {
        alert("请填入有效内容");
        return false;
    }
    return true;
}

function addStepDiv(quote, quiz_count, type) {
    var step_div = $('<div></div>'),
        input = $('<input type="text" class="small_step form-control"/>'),
        span = $('<span>{0}</span>'.format(quote));
    span.attr("style", "float: left; margin: 4px; width: 100%");

    if (type === "option") {
        input.attr("placeholder", '请从右侧选择，填写序号');
    }
    else {
        input.attr("placeholder", "定理名或文字描述,可回车");
        input.attr("onkeydown", "return enter_check(this, event, 'process'," +
                            quiz_count+")");

    }
    step_div.attr("class", type + " col-xs-12")
    step_div.append($(span));
    step_div.append(input);
    return step_div;
}

function qa_parse(c) {
    var clists = [], type, stem, template, match,
        answer, qparts, submit, html = "", quiz_count = 0,
        p = /{%([\w\W]*?)%}/g,
        typep = /([\w\W]*?)\|/,
        stemp = /\|[\w\W]*/;

    while (match = p.exec(c)) {
        clists.push(match[0]);
        p.lastIndex = match.index + 1;
    }

    var start = 0;

    for (var i in clists) {
        var stemend, temp = clists[i],
            response = $('<div class="math-container"></div>'),
            div = $('<div class="process"></div>'),
            feedback = $('<div class="hidden"></div>'),
            submit = $('<button class="btn btn-info">提交验证</button>');
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
                var option = template.format(type, qparts[j], 
                    String.fromCharCode(64+j) + ". " + qparts[j]) + '<br>';
                span.append($(option));
            }
            div.append(span);
        }
        else if (type == "text") {
            quiz_count++;
            var blank = $('<input type="text" class="quiz">');
            blank.attr("onkeydown", 'return enter_check(this, event, "quiz",'+quiz_count+")");
            div.append($('<br><span>'+stem.replace(/_/g, blank[0].outerHTML)+'</span><br>'));
        }
        else if (type == "formula") {
            quiz_count++;
            var blank = $('<input type="text" class="quiz formula">'),
                span;
            blank.attr("onkeydown", 'return enter_check(this, event, "quiz",'+quiz_count+")");
            span = $('<span>'+stem.replace(/_/g, blank[0].outerHTML)+'</span>');
            span.append($('<br><div class="MathPreview"></div><br>'));
            div.append("<br>")
            div.append(span);
        } else if (type == "process") {
            quiz_count++;
            qparts = stem.split("$");

            var step_div = addStepDiv('根据:', quiz_count, 'step-div'),
                mid_div = $('<div class="container"></div>');
                reason_div = $('<div class="col-xs-5 left"></div>'),
                option_div = $('<div class="col-xs-7 right"></div>');
            mid_div.attr("style", "min-height: 80px; width: 100%")
            reason_div.append(step_div);
            mid_div.append(reason_div);
            mid_div.append(option_div);
            div.append($('<p>{0}</p>'.format(qparts[0])));
            div.append(mid_div);
        }

        submit.attr("onclick", "check(this, '{0}', {1})".format(type, quiz_count));
        div.append('<br>');
        div.append(submit);
        div.append(feedback);

        response.append(div);

        html += c.substring(start, c.indexOf(temp, start)) + response[0].outerHTML;
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
            //console.log(data);
            loadingMask.parentNode.removeChild(loadingMask);

            if (!result) {
                alert(data.info);
                return;
            } 

            var tutorial = $("#tutorial"),
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

        },
        error: backendError
    });

    backToTop();
}

function draw() {
    initData();
}

function check(obj, type, id) {
    if (type === "process") {
        checkProcess(obj, id);
    } else {
        checkQuiz(obj, id);
    }
}

function enter_check(obj, e, type, id) {
    if ($(obj).is(".formula")) {
        Preview.Update(obj);
    }
    if(e.keyCode == 13) {
        check(obj, type, id);
        return false;
    }
    return true;
}

function renderOptions(div, options) {
    var right_div = div.children(".right");
    right_div.html('');
    option_match = {};
    for (var i in options) {
        var html = md.render(options[i]),
            t = String.fromCharCode(65+parseInt(i));
        option_match[t] = options[i];
        right_div.append($('<span>{0}</span>'.format(t + '.' + html)))
    }
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, right_div[0]]);
}

function right_and_freeze(obj) {
    obj.children("input").attr("readonly", "readonly");
    obj.append($('<i class="fa fa-check"></i>'))
}

function checkProcess(obj, id) {
    console.log("small step enter to backend");
    var json = [], parent = $(obj).parents(".process"),
        lesson = parent.parents(".lesson"),
        left = parent.children().children(".left"),
        right_div = parent.children().children(".right"),
        step = left.children(".step-div")
        allStep = step.children(".small_step"),
        optionsDiv = left.children(".option"),
        allOptions = optionsDiv.children("input"); 

    if (allStep[allStep.length - 1].value.trim() === "") {
        alert("请填入有效内容");
        return;
    }

    json[0] = allStep[allStep.length - 1].value;
    json[1] = match;
    console.log(allOptions.length);

    if (allOptions.length) {
        var obj = allOptions[allOptions.length - 1];
        console.log(obj);
        if (!validateOption(obj))
            return;

        console.log(obj.value.trim());
        if (!$(obj).attr("readonly")) {
            var v = obj.value.trim();
            console.log(v);
            if (v in option_match) {
                json[2] = [option_match[v], allStep[allStep.length - 2].value];
            }
            else {
                alert("请填写右边的选项序号")
                return;
            }
        }
    }

    console.log(json);
    console.log(left);

    var tutorial_url = document.URL.split('/')[4];
    $.ajax({
        method: "post",
        url : "/checkProcess",
        contentType: 'application/json',
        dataType: "json",
        data: JSON.stringify({'id': id, 'expression': json,
                'url': tutorial_url}),
        success : function (result){
            console.log(result);
            if (result.status) {
                parent.children('.comment').attr('class', 'hidden');
                right_div.html('');

                right_and_freeze($(step[step.length-1]));
                if (json.length === 3) {
                    console.log("freeze option");
                    right_and_freeze($(optionsDiv[optionsDiv.length - 1]));
                }

                if (result.finish) {
                    var lesson_id = parseInt(lesson.attr("class").substr(13));
                    check_result(result.status, lesson_id, id);
                } else {
                    for (var e in result.match) {
                        match[e] = result.match[e];
                    }
                    console.log(result.options);
                    if (result.options) {
                        var div = addStepDiv('接下来:', id, 'option');
                        left.append(div);
                        div.children("input")[0].focus();
                        renderOptions(parent.children(), result.options);
                        div = addStepDiv('接下来:', id, 'step-div');
                        left.append(div);
                    } else {
                        var div = addStepDiv('接下来:', id, 'step-div');
                        left.append(div);
                        div.children("input")[0].focus();
                    }
                }
            }
            else {
                result.comment = result.options;
                wrong_and_cross($(step[step.length-1]));
                if (json.length === 3) {
                    wrong_and_cross($(optionsDiv[optionsDiv.length - 1]));
                }
                display_comments(parent, result);
            }
            return;
        },
        error: backendError
    });
}

function wrong_and_cross(obj){

    obj.append($('<i class="fa fa-times"></i>'));
}

function checkQuiz(obj, id) {
    var value, your_answer,
        back_check = false,
        url = "/checkTextAnswer",
        tutorial_url = document.URL.split('/')[4],
        problem = $(obj).parents('.process'),
        ele = problem.children().children(".quiz"),
        type = ele.attr("type"),
        lesson_name = problem.parents('.lesson')[0].className,
        lesson_id = parseInt(lesson_name.substr(13));
    console.log(obj)

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
        success: function (result){
            console.log(result);
            if (result.comment) {
                display_comments(problem, result);
            }
            if (result.info) {
                $('.hint').css('display', 'block');
                $('.flashes').html('');
                $('.flashes').append("<li>对不起</li>")
                $('.flashes').append("<li>"+result.info+"</li>")
                setTimeout("$('.hint').fadeOut('slow')", 5000)
            } else if(result.status) {
                problem.children('div').attr('class', 'hidden');
                check_result(result.status, lesson_id, id);
            }

            return;
        },
        error: backendError
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

