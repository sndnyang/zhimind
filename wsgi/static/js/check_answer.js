
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
    // console.log(allOptions.length);

    if (allOptions.length) {
        var obj = allOptions[allOptions.length - 1];
        if (!validateOption(obj))
            return;

        if (!$(obj).attr("readonly")) {
            var v = obj.value.trim();
            if (v in option_match) {
                json[2] = [option_match[v], allStep[allStep.length - 2].value];
            }
            else {
                alert("请填写右边的选项序号")
                return;
            }
        }
    }

    //console.log(json);

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

