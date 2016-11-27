var options = [];

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

function qa_parse_full(c) {
    var start = c.indexOf("{%"), end, lists = [],
        s, quiz_type, html = "";

    global_answers = [''];
    global_comment = [''];
    while (start >= 0 && start < c.length) {
        end = find_right_next(c, start, 0, '\n')
        s = c.substring(start, end).trim()
        lists.push(s)
        quiz_type = s.substring(2, s.indexOf('|')).trim();
        answer = parse_answer(s, quiz_type);
        comment = parse_comment(s);
        global_answers.push(answer)
        global_comment.push(comment)
        start = c.indexOf("{%", end)
    }

    start = 0;

    for (var i in lists) {
        var temp = lists[i];
        renderQuestion(temp, i);
        html += c.substring(start, c.indexOf(temp, start)) + response[0].outerHTML;
        start = c.indexOf(temp) + temp.length;
    }
    html += c.substring(start, c.length);

    return html;
}

function checkProcess(obj, id) {
    console.log("small step enter to backend");
    var json = [], parent = $(obj).parents(".process"),
        lesson = parent.parents(".lesson"),
        left = parent.children().children(".left"),
        right_div = parent.children().children(".right"),
        step = left.children(".step-div"),
        allStep = step.children(".small_step"),
        optionsDiv = left.children(".option"),
        allOptions = optionsDiv.children("input"); 

    if (allStep[allStep.length - 1].value.trim() === "") {
        alert("请填入有效内容");
        return;
    }

    json[0] = allStep[allStep.length - 1].value;
    json[1] = match;
    json[2] = null;
    json[3] = null;
    // console.log(allOptions.length);
    var t = null;
    if (allStep.length > 1) {
        var temp = allStep[allStep.length - 2].value;
        for (var k in match) {
            if (match[k] === temp) {
                t = k;
                json[3] = k;
                break;
            }
        }
    }

    if (allOptions.length) {
        var obj = allOptions[allOptions.length - 1];

        if (!validateOption(obj))
            return;

        //console.log(obj.value.trim());
        if (!$(obj).attr("readonly")) {
            var v = obj.value.trim();
            if (v in option_match) {
                json[2] = [option_match[v], t];
                t = "readonly";
            }
            else {
                alert("请填写右边的选项序号")
                return;
            }
        }
    }

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
                if (optionsDiv.length > 0 && t === "readonly") {
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

    if (!document.URL.split('/')[3].indexOf('gewu.html')) {
        tutorial_url = "gewu-learning-methods-template";
    }

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

    console.log(tutorial_url + ' ' + id + " " + value)
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
                // problem.children('div').attr('class', 'hidden');
                check_result(result.status, lesson_id, id);
            }
            if (!document.URL.split('/')[3].indexOf('gewu.html')) {
                var tutorial = $("#tutorial"), text = ele.parent().html();

                if (id === 1) {
                    localStorage.setItem('name', ele[0].value);
                    var tutorial = $("#tutorial"),
                        root = document.URL.split('/')[3],
                        temp = gewu_content.replace(/{{它}}/g, ele[0].value),
                        html = md.render(qa_parse_full(temp))+"<h1>";
                    tutorial.html('')
                    global_lesson_count = generate_lesson(tutorial, html, root, 0);
                    startLesson(3);
                    display_comments($($('.process')[0]), result);
                    $($(".quiz")[0]).val(ele[0].value);
                }
                if (id === 2) {
                 // var type_map = {'问题': 'concept', '概念': 'concept', 
                 //     '方法': 'concept', '定理': 'method', '公理': 'method',
                 //     '定律': 'method', '算法': 'method', '其他'},
                 //     tutorial = $("#tutorial"),
                 //     root = document.URL.split('/')[3],
                 //     temp = type_map[ele[0].value],
                 //     html = md.render(qa_parse_full(temp))+"<h1>";
                 // tutorial.html('')
                 // global_lesson_count = generate_lesson(tutorial, html, root,
                 //     global_lesson_count);
                }

            }
            return;
        },
        error: backendError
    });
}

function updateLesson(no) {
    var pos = $('.lesson' + (no-1)).offset().top - $('.lesson1').offset().top + $('.lesson' + (no-1)).height();

    $('.result-html').animate({
        scrollTop: pos
    }, 500);
}
