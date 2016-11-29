
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
            if (result.comment) {
                if (typeof(result.comment) !== "string" && error_times > result.comment.length) {
                    result.comment = "真是太遗憾了，您没回答出来, 看来作者编写题目和提示的能力还得加强";
                    display_comments(problem, result);
                    check_result(true, lesson_id, id);
                } else {
                    display_comments(problem, result);
                }
            }
            return;
        },
        error: backendError
    });
}

