
var error_times = 0,
    currentLesson = 1,
    global_link = 'currentLesson';

function initLesson(link) {
    global_link = link+'currentLesson';
    currentLesson = localStorage.getItem(global_link) || 1;
    if (currentLesson !== 1) {
        startLesson(currentLesson);
    }
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
                check_result(result.response, lesson_id)
                return;
            }
        });
    } else {
        your_answer = $.md5(value);
        check_result(your_answer === correct, lesson_id)
    }
}

function check_result(result, id) {

    if (result) {
        updateLesson(id+1);
        error_times = 0;
    } else {
        $('.hint').css('display', 'block');
        $('.flashes').html('');
        if (id in global_comment) {
            var comments = global_comment[id];
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

function updateLesson(no) {

    if (no === currentLesson+1) {
        currentLesson = no;
        if (currentLesson === global_lesson_count) {
            var params = getRequest(),
                url = document.URL.split('/'),
                link = url[url.length-1].split('?')[0];
            params.tutor_id = link;

            console.log(params);
                
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
        localStorage.setItem(global_link, currentLesson);
        $('.lesson' + currentLesson).show();
    }
};

function startLesson(num) {
    for (var i = 2; i <= num; i++) {
        $('.lesson' + i).css('display', 'block');
        $('.lesson' + i).show();
    }
}
